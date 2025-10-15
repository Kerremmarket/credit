"""Forward pass tracing for model visualization."""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.tree import DecisionTreeClassifier
import logging

logger = logging.getLogger(__name__)


class TraceManager:
    """Manages forward pass tracing for different model types."""
    
    def trace_logistic_forward(
        self,
        model: Any,
        row: pd.DataFrame,
        features: List[str]
    ) -> Dict[str, Any]:
        """Trace forward pass for logistic regression."""
        
        try:
            # Get coefficients and intercept
            coef = model.coef_[0]
            intercept = model.intercept_[0]
            
            # Get feature values
            x = row[features].values[0]
            
            # Calculate weighted contributions
            weighted = x * coef
            
            # Calculate logit (z)
            z = np.sum(weighted) + intercept
            
            # Calculate probability
            proba = 1 / (1 + np.exp(-z))
            
            # Create layer trace
            layer_trace = {
                "type": "linear",
                "W": [coef.tolist()],  # 1xN weight matrix
                "b": [float(intercept)],
                "z": [float(z)],
                "a": [float(proba)],
                "feature_contributions": {
                    feat: float(x[i] * coef[i]) 
                    for i, feat in enumerate(features)
                }
            }
            
            result = {
                "layers": [layer_trace],
                "logit": float(z),
                "proba": float(proba)
            }
            
            logger.info("Traced logistic regression forward pass")
            return result
            
        except Exception as e:
            logger.error(f"Error tracing logistic forward pass: {str(e)}")
            return {
                "layers": [],
                "logit": 0.0,
                "proba": 0.5
            }
    
    def trace_mlp_forward(
        self,
        model_dict: Dict[str, Any],
        row: pd.DataFrame,
        features: List[str]
    ) -> Dict[str, Any]:
        """Trace forward pass for MLP."""
        
        try:
            # Preprocess input
            X = row[features].values.reshape(1, -1)
            X_imp = model_dict["imputer"].transform(X)
            
            if model_dict["scaler"]:
                X_scaled = model_dict["scaler"].transform(X_imp)
            else:
                X_scaled = X_imp
            
            model = model_dict["model"]
            
            # Get layer outputs
            layers_trace = []
            current_input = X_scaled[0]
            
            # Trace through each layer
            for i, layer in enumerate(model.layers):
                if hasattr(layer, 'get_weights'):
                    weights = layer.get_weights()
                    if len(weights) == 2:  # Dense layer with weights and bias
                        W, b = weights
                        
                        # Compute pre-activation
                        z = np.dot(current_input, W) + b
                        
                        # Apply activation
                        if hasattr(layer, 'activation'):
                            activation_name = layer.activation.__name__
                            if activation_name == 'relu':
                                a = np.maximum(0, z)
                            elif activation_name == 'sigmoid':
                                a = 1 / (1 + np.exp(-z))
                            else:
                                a = z
                        else:
                            a = z
                        
                        # Store layer trace
                        layer_trace = {
                            "type": "dense",
                            "W": W.tolist() if W.size < 1000 else None,  # Limit size
                            "b": b.tolist(),
                            "z": z.tolist(),
                            "a": a.tolist(),
                            "shape": f"{W.shape[0]}x{W.shape[1]}"
                        }
                        layers_trace.append(layer_trace)
                        
                        current_input = a
            
            # Final prediction
            final_output = current_input[0] if len(current_input.shape) > 0 else current_input
            if isinstance(final_output, np.ndarray):
                final_output = float(final_output[0])
            else:
                final_output = float(final_output)
            
            # Convert logit to probability if needed
            if final_output < 0 or final_output > 1:
                proba = 1 / (1 + np.exp(-final_output))
            else:
                proba = final_output
            
            result = {
                "layers": layers_trace,
                "logit": float(np.log(proba / (1 - proba + 1e-10))),
                "proba": float(proba)
            }
            
            logger.info("Traced MLP forward pass")
            return result
            
        except Exception as e:
            logger.error(f"Error tracing MLP forward pass: {str(e)}")
            return {
                "layers": [],
                "logit": 0.0,
                "proba": 0.5
            }
    
    def trace_tree_path(
        self,
        model: Any,
        row: pd.DataFrame,
        features: List[str]
    ) -> Dict[str, Any]:
        """Trace decision path for tree-based models."""
        
        try:
            X = row[features].values.reshape(1, -1)
            
            # For RandomForest, use the first estimator as example
            if hasattr(model, 'estimators_'):
                tree = model.estimators_[0]
            else:
                # For XGBoost
                tree = model
            
            # Get decision path
            if hasattr(tree, 'decision_path'):
                decision_path = tree.decision_path(X)
                leaf = tree.apply(X)[0]
                
                # Extract path nodes
                path_nodes = []
                node_indicator = decision_path.toarray()[0]
                
                # Get tree structure
                if hasattr(tree, 'tree_'):
                    tree_struct = tree.tree_
                    
                    for node_id in range(len(node_indicator)):
                        if node_indicator[node_id]:
                            # This node is in the path
                            if tree_struct.feature[node_id] != -2:  # Not a leaf
                                feature_idx = tree_struct.feature[node_id]
                                threshold = tree_struct.threshold[node_id]
                                sample_value = X[0, feature_idx]
                                
                                # Determine direction
                                if node_id + 1 < len(node_indicator) and node_indicator[node_id + 1]:
                                    # Check which child was taken
                                    if tree_struct.children_left[node_id] == node_id + 1:
                                        direction = "left"
                                    else:
                                        direction = "right"
                                else:
                                    direction = "left" if sample_value <= threshold else "right"
                                
                                node = {
                                    "feature": features[feature_idx],
                                    "threshold": float(threshold),
                                    "sample_value": float(sample_value),
                                    "direction": direction,
                                    "impurity": float(tree_struct.impurity[node_id]),
                                    "leaf_value": None,
                                    "is_leaf": False
                                }
                            else:
                                # Leaf node
                                node = {
                                    "feature": None,
                                    "threshold": None,
                                    "sample_value": None,
                                    "direction": None,
                                    "impurity": None,
                                    "leaf_value": float(tree_struct.value[node_id][0, 1] / 
                                                      (tree_struct.value[node_id][0, 0] + 
                                                       tree_struct.value[node_id][0, 1])),
                                    "is_leaf": True
                                }
                            
                            path_nodes.append(node)
            else:
                # Fallback for models without decision_path
                path_nodes = [{
                    "feature": None,
                    "threshold": None,
                    "sample_value": None,
                    "direction": None,
                    "impurity": None,
                    "leaf_value": 0.5,
                    "is_leaf": True
                }]
            
            # Get prediction
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(X)[0, 1]
            else:
                proba = 0.5
            
            result = {
                "path": path_nodes,
                "prediction": float(proba)
            }
            
            logger.info("Traced tree decision path")
            return result
            
        except Exception as e:
            logger.error(f"Error tracing tree path: {str(e)}")
            return {
                "path": [],
                "prediction": 0.5
            }


# Global instance
trace_manager = TraceManager()
