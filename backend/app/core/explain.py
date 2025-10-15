"""SHAP and PDP/ALE explanation utilities."""
import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Any, Optional, Tuple
from sklearn.inspection import PartialDependenceDisplay
import logging

from .config import SHAP_MAX_SAMPLES, PDP_GRID_SIZE
from .cache import cache_manager

logger = logging.getLogger(__name__)


class ExplainabilityManager:
    """Manages SHAP and PDP/ALE computations."""
    
    def __init__(self):
        self.explainers: Dict[str, Any] = {}
        self.background_data: Optional[pd.DataFrame] = None
        
    def compute_shap_summary(
        self,
        model_type: str,
        model: Any,
        X_train: pd.DataFrame,
        features: List[str],
        max_samples: int = SHAP_MAX_SAMPLES
    ) -> Dict[str, Any]:
        """Compute global SHAP feature importance."""
        
        # Check cache
        cache_key_params = {
            "model_type": model_type,
            "features": str(sorted(features)),
            "n_samples": min(len(X_train), max_samples)
        }
        
        cached = cache_manager.get("shap_summary", **cache_key_params)
        if cached is not None:
            return cached
        
        try:
            # Always keep some background around for later local explains
            self.background_data = X_train.copy()
            # Sample data if needed
            if len(X_train) > max_samples:
                X_sample = X_train.sample(n=max_samples, random_state=42)
            else:
                X_sample = X_train
            
            # Create explainer based on model type
            if model_type == "logistic":
                # For logistic regression, use Linear explainer
                explainer = shap.LinearExplainer(model, X_sample)
                sv = explainer.shap_values(X_sample)
                # Handle Explanation object or array/list
                if hasattr(sv, 'values'):
                    shap_values = sv.values
                else:
                    shap_values = sv
                
            elif model_type in ["rf", "xgb"]:
                # For tree models, prefer probability-space explanations
                try:
                    explainer = shap.TreeExplainer(model, model_output="probability")
                except Exception:
                    explainer = shap.TreeExplainer(model)
                sv = explainer.shap_values(X_sample)
                if hasattr(sv, 'values'):
                    shap_values = sv.values
                else:
                    shap_values = sv
                
            elif model_type == "mlp":
                # For neural networks, use KernelExplainer (slower)
                # Create a predict function for SHAP
                def predict_fn(X):
                    if isinstance(model, dict):
                        # Handle our MLP structure
                        X_imp = model["imputer"].transform(X)
                        if model["scaler"]:
                            X_scaled = model["scaler"].transform(X_imp)
                        else:
                            X_scaled = X_imp
                        return model["model"].predict(X_scaled, verbose=0).flatten()
                    else:
                        return model.predict(X, verbose=0).flatten()
                
                # Use smaller background for kernel explainer
                background = shap.sample(X_sample, min(100, len(X_sample)))
                explainer = shap.KernelExplainer(predict_fn, background)
                shap_values = explainer.shap_values(X_sample.head(min(100, len(X_sample))))
                
            else:
                raise ValueError(f"Unknown model type for SHAP: {model_type}")
            
            # Calculate feature importance (mean absolute SHAP values)
            if isinstance(shap_values, list):
                # For binary classifiers, prefer positive class if available
                try:
                    shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
                    if hasattr(shap_values, 'values'):
                        shap_values = shap_values.values
                except Exception:
                    shap_values = shap_values[0]
            
            feature_importance = {}
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            # Sanitize NaNs/Infs
            mean_abs_shap = np.nan_to_num(mean_abs_shap, nan=0.0, posinf=0.0, neginf=0.0)
            
            for feat, importance in zip(features, mean_abs_shap):
                feature_importance[feat] = float(importance)
            
            # Sort by importance
            feature_importance = dict(sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            ))
            
            # Resolve base value robustly across SHAP versions/shapes
            base_value = 0.0
            if hasattr(explainer, 'expected_value'):
                ev = explainer.expected_value
                try:
                    if isinstance(ev, (list, tuple, np.ndarray)):
                        base_value = float(np.array(ev).flatten()[0])
                    else:
                        base_value = float(ev)
                except Exception:
                    base_value = 0.0
                if not np.isfinite(base_value):
                    base_value = 0.0

            result = {
                "feature_importance": feature_importance,
                "base_value": base_value
            }
            
            # Cache the result
            cache_manager.set("shap_summary", result, **cache_key_params)
            
            # Store explainer for local explanations
            self.explainers[model_type] = explainer
            self.background_data = X_sample
            
            logger.info(f"Computed SHAP summary for {model_type}")
            return result
            
        except Exception as e:
            logger.error(f"Error computing SHAP summary: {str(e)}")
            # Fallback: use model feature_importances_ if available
            try:
                import numpy as _np
                if hasattr(model, 'feature_importances_'):
                    imps = getattr(model, 'feature_importances_')
                    imps = _np.nan_to_num(_np.array(imps, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)
                    feature_importance = {feat: float(val) for feat, val in zip(features, imps)}
                    feature_importance = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
                    return {
                        "feature_importance": feature_importance,
                        "base_value": 0.0
                    }
            except Exception as _:
                pass
            # Final fallback
            return {
                "feature_importance": {feat: 0.0 for feat in features},
                "base_value": 0.0
            }
    
    def compute_shap_local(
        self,
        model_type: str,
        model: Any,
        row: pd.DataFrame,
        features: List[str]
    ) -> Dict[str, Any]:
        """Compute local SHAP values for a single instance."""
        
        try:
            # Get or create explainer
            if model_type not in self.explainers:
                # Need to create explainer with some background data
                if self.background_data is None:
                    # As a fallback, use the row itself as tiny background
                    self.background_data = row.copy()
                
                if model_type == "logistic":
                    explainer = shap.LinearExplainer(model, self.background_data)
                elif model_type in ["rf", "xgb"]:
                    # Prefer probability-space explanations and use background if available
                    try:
                        if self.background_data is not None:
                            explainer = shap.TreeExplainer(
                                model,
                                data=self.background_data,
                                model_output="probability"
                            )
                        else:
                            explainer = shap.TreeExplainer(model, model_output="probability")
                    except Exception:
                        explainer = shap.TreeExplainer(model)
                elif model_type == "mlp":
                    def predict_fn(X):
                        if isinstance(model, dict):
                            X_imp = model["imputer"].transform(X)
                            if model["scaler"]:
                                X_scaled = model["scaler"].transform(X_imp)
                            else:
                                X_scaled = X_imp
                            return model["model"].predict(X_scaled, verbose=0).flatten()
                        else:
                            return model.predict(X, verbose=0).flatten()
                    
                    background = shap.sample(self.background_data, min(100, len(self.background_data)))
                    explainer = shap.KernelExplainer(predict_fn, background)
                else:
                    raise ValueError(f"Unknown model type: {model_type}")
                
                self.explainers[model_type] = explainer
            else:
                explainer = self.explainers[model_type]
            
            # Compute SHAP values for the instance
            try:
                row_input = row.values if hasattr(row, 'values') else row
                sv = explainer.shap_values(row_input)
            except Exception:
                sv = explainer.shap_values(row)
            # Unpack Explanation object or arrays
            if hasattr(sv, 'values'):
                shap_values = sv.values
            else:
                shap_values = sv
            if isinstance(shap_values, list):
                # For binary, prefer positive class
                try:
                    shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
                    if hasattr(shap_values, 'values'):
                        shap_values = shap_values.values
                except Exception:
                    shap_values = shap_values[0]
            if hasattr(shap_values, 'shape') and len(shap_values.shape) > 1:
                shap_values = shap_values[0]
            # Sanitize NaNs/Infs
            shap_values = np.nan_to_num(np.array(shap_values, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)
            
            # Create feature-value mapping
            shap_dict = {}
            for feat, shap_val in zip(features, shap_values):
                shap_dict[feat] = float(shap_val)
            
            # Get base value
            if hasattr(explainer, 'expected_value'):
                ev = explainer.expected_value
                try:
                    if isinstance(ev, (list, tuple, np.ndarray)):
                        base_value = float(np.array(ev).flatten()[0])
                    else:
                        base_value = float(ev)
                except Exception:
                    base_value = 0.0
            else:
                base_value = 0.0
            
            # Calculate prediction using the model when available for consistency
            try:
                if hasattr(model, 'predict_proba'):
                    row_for_model = row.values if hasattr(row, 'values') else row
                    prediction = float(model.predict_proba(row_for_model)[0, 1])
                else:
                    # Fallback: derive from SHAP base and contributions
                    prediction = base_value + float(np.sum(shap_values))
                    # If not already in probability space, map via sigmoid
                    if not (0.0 <= prediction <= 1.0):
                        prediction = 1 / (1 + np.exp(-prediction))
            except Exception:
                prediction = base_value + float(np.sum(shap_values))
                if not (0.0 <= prediction <= 1.0):
                    prediction = 1 / (1 + np.exp(-prediction))
            
            result = {
                "shap_values": shap_dict,
                "base_value": base_value,
                "prediction": float(prediction)
            }
            
            logger.info(f"Computed local SHAP for {model_type}")
            return result
            
        except Exception as e:
            logger.error(f"Error computing local SHAP: {str(e)}")
            # Return zeros if SHAP fails
            return {
                "shap_values": {feat: 0.0 for feat in features},
                "base_value": 0.0,
                "prediction": 0.5
            }
    
    def compute_pdp(
        self,
        model_type: str,
        model: Any,
        X_train: pd.DataFrame,
        features: List[str],
        target_features: List[str],
        grid_size: int = PDP_GRID_SIZE
    ) -> Dict[str, Dict[str, List[float]]]:
        """Compute Partial Dependence Plots."""
        
        # Check cache
        cache_key_params = {
            "model_type": model_type,
            "features": str(sorted(features)),
            "target_features": str(sorted(target_features))
        }
        
        cached = cache_manager.get("pdp", **cache_key_params)
        if cached is not None:
            return cached
        
        try:
            pdp_data = {}
            
            # Sample data for faster computation
            if len(X_train) > 1000:
                X_sample = X_train.sample(n=1000, random_state=42)
            else:
                X_sample = X_train

            # Cast integer columns to float to avoid warnings/errors in PDP
            try:
                X_sample = X_sample.apply(
                    lambda col: col.astype(float) if np.issubdtype(col.dtype, np.integer) else col
                )
            except Exception:
                pass
            
            for feat in target_features:
                if feat not in features:
                    continue
                
                feat_idx = features.index(feat)
                
                # Compute PDP
                from sklearn.inspection import partial_dependence
                
                pdp_result = partial_dependence(
                    model, X_sample, [feat_idx],
                    kind='average',
                    grid_resolution=grid_size
                )

                # Normalize return structure across sklearn versions
                grid_values = None
                averages = None
                try:
                    # Newer sklearn returns Bunch with attributes
                    if hasattr(pdp_result, 'grid_values'):
                        grid_values = pdp_result.grid_values[0]
                    if hasattr(pdp_result, 'average'):
                        averages = pdp_result.average[0]
                    elif hasattr(pdp_result, 'averaged_predictions'):
                        averages = pdp_result.averaged_predictions[0]
                except Exception:
                    pass

                if grid_values is None or averages is None:
                    try:
                        grid_values = pdp_result['grid'][0]
                        averages = pdp_result['average'][0]
                    except Exception:
                        # Last resort: attempt different keys
                        grid_values = (pdp_result.get('grid_values') or [])[0]
                        averages = (pdp_result.get('average') or pdp_result.get('averaged_predictions') or [])[0]

                pdp_data[feat] = {
                    "grid": list(np.array(grid_values).tolist() if hasattr(grid_values, 'tolist') else grid_values),
                    "values": list(np.array(averages).tolist() if hasattr(averages, 'tolist') else averages),
                }
            
            # Cache the result
            cache_manager.set("pdp", pdp_data, **cache_key_params)
            
            logger.info(f"Computed PDP for {model_type}")
            return pdp_data
            
        except Exception as e:
            logger.error(f"Error computing PDP: {str(e)}")
            return {}


# Global instance
explainability_manager = ExplainabilityManager()
