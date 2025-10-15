"""Model training and prediction utilities."""
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, accuracy_score, confusion_matrix
import xgboost as xgb
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import logging

from .config import MODELS_DIR, MLP_EPOCHS, MLP_HIDDEN, RANDOM_STATE
from .pipeline import create_model_pipeline

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages model training, saving, and loading."""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.pipelines: Dict[str, Any] = {}
        self.feature_configs: Dict[str, List[str]] = {}
        
    def train_model(
        self,
        model_type: str,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        features: List[str],
        scale: bool = True
    ) -> Dict[str, Any]:
        """Train a model and return metrics."""
        
        start_time = time.time()
        
        # Create model based on type
        if model_type == "logistic":
            model = LogisticRegression(
                class_weight='balanced',
                max_iter=1000,
                random_state=RANDOM_STATE
            )
        elif model_type == "rf":
            model = RandomForestClassifier(
                n_estimators=100,  # Reduced for speed
                max_depth=10,
                class_weight='balanced_subsample',
                random_state=RANDOM_STATE,
                n_jobs=-1
            )
        elif model_type == "xgb":
            model = xgb.XGBClassifier(
                n_estimators=100,  # Reduced for speed
                max_depth=4,
                subsample=0.8,
                colsample_bytree=0.8,
                eval_metric='logloss',
                tree_method='hist',
                random_state=RANDOM_STATE
            )
        elif model_type == "mlp":
            # For MLP, we'll handle it separately due to TensorFlow
            return self._train_mlp(X_train, X_test, y_train, y_test, features, scale)
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Create pipeline
        pipeline = create_model_pipeline(model, features, scale)
        
        # Train
        pipeline.fit(X_train, y_train)
        
        # Predict
        y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= 0.5).astype(int)
        
        # Calculate metrics
        metrics = {
            "auc": float(roc_auc_score(y_test, y_pred_proba)),
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "training_time": time.time() - start_time,
            "avg_proba_test": float(np.mean(y_pred_proba)),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist()
        }
        
        # Feature importance for tree models
        if model_type in ["rf", "xgb"]:
            feature_importance = {}
            importances = pipeline.named_steps['classifier'].feature_importances_
            for feat, imp in zip(features, importances):
                feature_importance[feat] = float(imp)
            metrics["feature_importance"] = feature_importance
        
        # Store model and pipeline
        self.models[model_type] = model
        self.pipelines[model_type] = pipeline
        self.feature_configs[model_type] = features
        
        # Save to disk
        self._save_model(model_type, pipeline, features, metrics)
        
        logger.info(f"Trained {model_type} model with AUC: {metrics['auc']:.3f}")
        
        return metrics
    
    def _train_mlp(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        features: List[str],
        scale: bool = True
    ) -> Dict[str, Any]:
        """Train MLP model using TensorFlow."""
        
        start_time = time.time()
        
        # Preprocess data
        from sklearn.preprocessing import StandardScaler
        from sklearn.impute import SimpleImputer
        
        # Impute missing values
        imputer = SimpleImputer(strategy='median')
        X_train_imp = imputer.fit_transform(X_train)
        X_test_imp = imputer.transform(X_test)
        
        # Scale if needed
        if scale:
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train_imp)
            X_test_scaled = scaler.transform(X_test_imp)
        else:
            X_train_scaled = X_train_imp
            X_test_scaled = X_test_imp
        
        # Build model
        model = keras.Sequential()
        model.add(layers.Input(shape=(len(features),)))
        
        # Hidden layers
        for units in MLP_HIDDEN:
            model.add(layers.Dense(units, activation='relu'))
            model.add(layers.Dropout(0.3))
        
        # Output layer
        model.add(layers.Dense(1, activation='sigmoid'))
        
        # Compile
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['AUC']
        )
        
        # Train
        history = model.fit(
            X_train_scaled, y_train,
            validation_split=0.1,
            epochs=MLP_EPOCHS,
            batch_size=32,
            verbose=0,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)
            ]
        )
        
        # Evaluate
        y_pred_proba = model.predict(X_test_scaled, verbose=0).flatten()
        y_pred = (y_pred_proba >= 0.5).astype(int)
        
        # Metrics
        metrics = {
            "auc": float(roc_auc_score(y_test, y_pred_proba)),
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "training_time": time.time() - start_time,
            "avg_proba_test": float(np.mean(y_pred_proba)),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist()
        }
        
        # Store model and preprocessing
        self.models["mlp"] = {
            "model": model,
            "imputer": imputer,
            "scaler": scaler if scale else None
        }
        self.feature_configs["mlp"] = features
        
        # Save model
        model_dir = MODELS_DIR / "mlp"
        model_dir.mkdir(exist_ok=True)
        model.save(model_dir / "model.keras")
        joblib.dump(imputer, model_dir / "imputer.joblib")
        if scale:
            joblib.dump(scaler, model_dir / "scaler.joblib")
        joblib.dump(features, model_dir / "features.joblib")
        joblib.dump(metrics, model_dir / "metrics.joblib")
        
        logger.info(f"Trained MLP model with AUC: {metrics['auc']:.3f}")
        
        return metrics
    
    def predict(self, model_type: str, X: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Make predictions using a trained model."""
        
        if model_type not in self.pipelines and model_type != "mlp":
            raise ValueError(f"Model {model_type} not trained")
        
        if model_type == "mlp":
            # Handle MLP separately
            mlp_data = self.models.get("mlp")
            if not mlp_data:
                raise ValueError("MLP model not trained")
            
            X_imp = mlp_data["imputer"].transform(X)
            if mlp_data["scaler"]:
                X_scaled = mlp_data["scaler"].transform(X_imp)
            else:
                X_scaled = X_imp
            
            proba = mlp_data["model"].predict(X_scaled, verbose=0).flatten()
            log_odds = np.log(proba / (1 - proba + 1e-10))
            return proba, log_odds
        
        # For sklearn models
        pipeline = self.pipelines[model_type]
        proba = pipeline.predict_proba(X)[:, 1]
        
        # Calculate log odds
        log_odds = np.log(proba / (1 - proba + 1e-10))
        
        return proba, log_odds
    
    def _save_model(
        self,
        model_type: str,
        pipeline: Any,
        features: List[str],
        metrics: Dict[str, Any]
    ):
        """Save model artifacts to disk."""
        
        model_dir = MODELS_DIR / model_type
        model_dir.mkdir(exist_ok=True)
        
        # Save pipeline
        joblib.dump(pipeline, model_dir / "pipeline.joblib")
        
        # Save feature config
        joblib.dump(features, model_dir / "features.joblib")
        
        # Save metrics
        joblib.dump(metrics, model_dir / "metrics.joblib")
        
        logger.info(f"Saved {model_type} model to {model_dir}")
    
    def load_model(self, model_type: str) -> bool:
        """Load a model from disk."""
        
        model_dir = MODELS_DIR / model_type
        
        try:
            if model_type == "mlp":
                # Load MLP model
                model = keras.models.load_model(model_dir / "model.keras")
                imputer = joblib.load(model_dir / "imputer.joblib")
                scaler = None
                if (model_dir / "scaler.joblib").exists():
                    scaler = joblib.load(model_dir / "scaler.joblib")
                
                self.models["mlp"] = {
                    "model": model,
                    "imputer": imputer,
                    "scaler": scaler
                }
            else:
                # Load sklearn pipeline
                pipeline = joblib.load(model_dir / "pipeline.joblib")
                self.pipelines[model_type] = pipeline
                self.models[model_type] = pipeline.named_steps['classifier']
            
            # Load feature config
            features = joblib.load(model_dir / "features.joblib")
            self.feature_configs[model_type] = features
            
            logger.info(f"Loaded {model_type} model from {model_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load {model_type} model: {str(e)}")
            return False
    
    def get_model_info(self, model_type: str) -> Optional[Dict[str, Any]]:
        """Get information about a trained model."""
        
        model_dir = MODELS_DIR / model_type
        metrics_file = model_dir / "metrics.joblib"
        
        if metrics_file.exists():
            return joblib.load(metrics_file)
        
        return None


# Global instance
model_manager = ModelManager()
