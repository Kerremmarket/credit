"""Main FastAPI application."""
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from typing import Dict, Any

from .core.config import FRONTEND_ORIGIN, DEMO_MODE
from .core.schemas import (
    DataLoadRequest, DataLoadResponse,
    ExemplarsRequest, ExemplarsResponse,
    TrainRequest, TrainResponse,
    PredictRequest, PredictResponse,
    ForwardTraceRequest, ForwardTraceResponse,
    TreePathRequest, TreePathResponse,
    ShapSummaryRequest, ShapSummaryResponse,
    ShapLocalRequest, ShapLocalResponse,
    PDPRequest, PDPResponse,
    EnsembleTraceRequest, EnsembleTraceResponse,
    ModelArchitectureResponse
)
from .core.data import data_manager
from .core.models import model_manager
from .core.explain import explainability_manager
from .core.trace import trace_manager
from .core.cache import cache_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Give Me Some Credit API",
    description="API for credit risk model training and explanation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize the application."""
    logger.info(f"Starting Give Me Some Credit API (Demo Mode: {DEMO_MODE})")
    

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Give Me Some Credit API",
        "demo_mode": DEMO_MODE,
        "endpoints": [
            "/api/health",
            "/api/data/load",
            "/api/data/exemplars",
            "/api/train",
            "/api/predict",
            "/api/trace/forward",
            "/api/trace/treepath",
            "/api/explain/shap-summary",
            "/api/explain/shap-local",
            "/api/explain/pdp"
        ]
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "demo_mode": DEMO_MODE}


@app.post("/api/data/load", response_model=DataLoadResponse)
async def load_data(request: DataLoadRequest):
    """Load and analyze the dataset."""
    try:
        result = data_manager.load_dataset(request.path)
        return DataLoadResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data/exemplars", response_model=ExemplarsResponse)
async def get_exemplars(request: ExemplarsRequest):
    """Get exemplar samples from the dataset."""
    try:
        if data_manager.df is None:
            raise HTTPException(status_code=400, detail="No dataset loaded")
        
        result = data_manager.get_exemplars(request.k, request.features)
        return ExemplarsResponse(**result)
    except Exception as e:
        logger.error(f"Error getting exemplars: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """Train a model with the specified configuration."""
    try:
        if data_manager.df is None:
            raise HTTPException(status_code=400, detail="No dataset loaded")
        
        # Apply filters
        filtered_df = data_manager.apply_filters(request.filters)
        
        # Get training sample
        sample_df = data_manager.get_training_sample(filtered_df)
        
        # Prepare train-test split
        X_train, X_test, y_train, y_test = data_manager.prepare_train_test_split(
            sample_df,
            request.feature_config,
            request.test_size,
            request.random_state
        )
        
        # Train model
        metrics = model_manager.train_model(
            request.model,
            X_train, X_test,
            y_train, y_test,
            request.feature_config,
            request.scale_numeric,
            request.n_estimators,
            request.hidden_layers
        )
        # Separate confusion matrix and feature_importance to satisfy schema types
        confusion = []
        feature_importance = None
        if isinstance(metrics, dict) and "confusion_matrix" in metrics:
            confusion = metrics.get("confusion_matrix", [])
        if isinstance(metrics, dict) and "feature_importance" in metrics:
            feature_importance = metrics.get("feature_importance")
        try:
            # Remove non-float entries from metrics to align with Dict[str, float]
            metrics = {k: float(v) for k, v in metrics.items() if k not in ["confusion_matrix", "feature_importance"]}
        except Exception:
            # Fallback: keep only known numeric keys
            keep_keys = ["auc", "accuracy", "training_time", "avg_proba_test"]
            metrics = {k: float(metrics[k]) for k in keep_keys if k in metrics}

        # Sanitize metrics for JSON (no NaN/Inf)
        def _safe(x):
            try:
                from math import isfinite
                xv = float(x)
                return xv if isfinite(xv) else 0.0
            except Exception:
                return 0.0
        metrics = {k: _safe(v) for k, v in metrics.items()}
        
        # Invalidate caches for this model (explanations, PDP)
        cache_manager.invalidate_prefix(f"shap_summary_{request.model}")
        cache_manager.invalidate_prefix(f"pdp_{request.model}")
        
        return TrainResponse(
            success=True,
            model=request.model,
            metrics=metrics,
            confusion_matrix=confusion,
            feature_importance=feature_importance,
            train_count=len(X_train),
            test_count=len(X_test),
            training_time=_safe(metrics.get("training_time", 0))
        )
        
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """Make predictions for given rows."""
    try:
        # Get feature configuration for the model
        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
        
        # Convert rows to DataFrame
        df = pd.DataFrame(request.rows)
        
        # Ensure all features are present
        for feat in features:
            if feat not in df.columns:
                df[feat] = 0  # Default value
        
        # Make predictions
        proba, log_odds = model_manager.predict(request.model, df[features])
        
        return PredictResponse(
            predictions=proba.tolist(),
            log_odds=log_odds.tolist() if log_odds is not None else None
        )
        
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trace/forward", response_model=ForwardTraceResponse)
async def trace_forward(request: ForwardTraceRequest):
    """Trace forward pass for logistic or MLP model."""
    try:
        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
        
        # Convert row to DataFrame
        df = pd.DataFrame([request.row])
        for feat in features:
            if feat not in df.columns:
                df[feat] = 0
        
        # Get model
        if request.model == "logistic":
            if "logistic" not in model_manager.pipelines:
                raise HTTPException(status_code=400, detail="Logistic model not trained")
            
            # Get the preprocessed data
            pipeline = model_manager.pipelines["logistic"]
            X_processed = pipeline.named_steps['preprocessor'].transform(df[features])
            df_processed = pd.DataFrame(X_processed, columns=features)
            
            # Trace forward pass
            model = pipeline.named_steps['classifier']
            result = trace_manager.trace_logistic_forward(model, df_processed, features)
            
        elif request.model == "mlp":
            model_dict = model_manager.models.get("mlp")
            if not model_dict:
                raise HTTPException(status_code=400, detail="MLP model not trained")
            
            result = trace_manager.trace_mlp_forward(model_dict, df, features)
            
        else:
            raise HTTPException(status_code=400, detail=f"Tracing not supported for {request.model}")
        
        return ForwardTraceResponse(**result)
        
    except Exception as e:
        logger.error(f"Error tracing forward pass: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trace/treepath", response_model=TreePathResponse)
async def trace_tree_path(request: TreePathRequest):
    """Trace decision path for tree-based models."""
    try:
        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
        
        if request.model not in ["rf", "xgb"]:
            raise HTTPException(status_code=400, detail=f"Tree path not supported for {request.model}")
        
        # Convert row to DataFrame
        df = pd.DataFrame([request.row])
        for feat in features:
            if feat not in df.columns:
                df[feat] = 0
        
        # Get model and trace path
        pipeline = model_manager.pipelines.get(request.model)
        if not pipeline:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
        
        # Preprocess data
        X_processed = pipeline.named_steps['preprocessor'].transform(df[features])
        df_processed = pd.DataFrame(X_processed, columns=features)
        
        # Trace path
        model = pipeline.named_steps['classifier']
        result = trace_manager.trace_tree_path(model, df_processed, features)
        
        # Optionally include a compact full-tree snapshot for visualization
        tree_payload = None
        if request.full_tree:
            try:
                # Pick first estimator for ensembles; for xgb, try booster dump
                if hasattr(model, 'estimators_') and len(model.estimators_) > 0:
                    tree0 = model.estimators_[0].tree_
                    feature_names = features
                    tree_payload = {
                        "children_left": tree0.children_left.tolist(),
                        "children_right": tree0.children_right.tolist(),
                        "feature": tree0.feature.tolist(),
                        "threshold": tree0.threshold.tolist(),
                        "feature_names": feature_names,
                        "feature_abbrev": {f: (f if len(f) <= 12 else f[:12] + '…') for f in feature_names},
                    }
                    logger.info(f"Built RF full_tree payload with {len(tree_payload['feature'])} nodes")
                else:
                    # XGBoost: build tree arrays from Booster dataframe
                    try:
                        booster = model.get_booster()
                        import pandas as _pd
                        df_tree = booster.trees_to_dataframe()
                        df0 = df_tree[df_tree['Tree'] == 0].copy()
                        # Map original node ids to 0..n-1
                        node_ids = _pd.unique(df0['Node'].astype(int))
                        id_to_idx = {int(n): i for i, n in enumerate(sorted(node_ids))}
                        n_nodes = len(id_to_idx)
                        children_left = [-1] * n_nodes
                        children_right = [-1] * n_nodes
                        feature_idx = [-2] * n_nodes
                        threshold = [0.0] * n_nodes
                        for _, row0 in df0.iterrows():
                            nid = int(row0['Node'])
                            idx = id_to_idx[nid]
                            if 'Feature' in row0 and isinstance(row0['Feature'], str) and row0['Feature'].startswith('f'):
                                try:
                                    feature_idx[idx] = int(row0['Feature'][1:])
                                except Exception:
                                    feature_idx[idx] = -2
                                threshold[idx] = float(row0['Split']) if not _pd.isna(row0['Split']) else 0.0
                                yes = int(row0['Yes']) if not _pd.isna(row0['Yes']) else -1
                                no = int(row0['No']) if not _pd.isna(row0['No']) else -1
                                children_left[idx] = id_to_idx.get(yes, -1)
                                children_right[idx] = id_to_idx.get(no, -1)
                            else:
                                # leaf
                                feature_idx[idx] = -2
                                children_left[idx] = -1
                                children_right[idx] = -1
                        feature_names = features
                        tree_payload = {
                            "children_left": children_left,
                            "children_right": children_right,
                            "feature": feature_idx,
                            "threshold": threshold,
                            "feature_names": feature_names,
                            "feature_abbrev": {f: (f if len(f) <= 12 else f[:12] + '…') for f in feature_names},
                        }
                        logger.info(f"Built XGB full_tree payload with {len(feature_idx)} nodes")
                    except Exception:
                        # Fallback: try to get a scikit-like tree attributes
                        if hasattr(model, 'tree_'):
                            tree0 = model.tree_
                            feature_names = features
                            tree_payload = {
                                "children_left": tree0.children_left.tolist(),
                                "children_right": tree0.children_right.tolist(),
                                "feature": tree0.feature.tolist(),
                                "threshold": tree0.threshold.tolist(),
                                "feature_names": feature_names,
                                "feature_abbrev": {f: (f if len(f) <= 12 else f[:12] + '…') for f in feature_names},
                            }
            except Exception:
                tree_payload = None
        
        return TreePathResponse(**result, tree=tree_payload)
        
    except Exception as e:
        logger.error(f"Error tracing tree path: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/explain/shap-summary", response_model=ShapSummaryResponse)
async def shap_summary(request: ShapSummaryRequest):
    """Get global feature importance (no SHAP)."""
    try:
        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")

        # Return lightweight global feature importance
        if request.model == "logistic":
            pipeline = model_manager.pipelines.get("logistic")
            if not pipeline:
                raise HTTPException(status_code=400, detail="Logistic model not trained")
            clf = pipeline.named_steps['classifier']
            try:
                coef = clf.coef_.ravel()
                import numpy as _np
                coef = _np.nan_to_num(coef, nan=0.0, posinf=0.0, neginf=0.0)
                fi = {feat: float(abs(val)) for feat, val in zip(features, coef)}
            except Exception:
                fi = {feat: 0.0 for feat in features}
            return ShapSummaryResponse(feature_importance=dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)))

        if request.model in ["rf", "xgb"]:
            pipeline = model_manager.pipelines.get(request.model)
            if not pipeline:
                raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
            clf = pipeline.named_steps['classifier']
            try:
                import numpy as _np
                imps = getattr(clf, 'feature_importances_', _np.zeros(len(features)))
                imps = _np.nan_to_num(_np.array(imps, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)
                fi = {feat: float(val) for feat, val in zip(features, imps)}
            except Exception:
                fi = {feat: 0.0 for feat in features}
            return ShapSummaryResponse(feature_importance=dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)))

        if request.model == "mlp":
            mlp_data = model_manager.models.get("mlp")
            if not isinstance(mlp_data, dict):
                raise HTTPException(status_code=400, detail="MLP model not trained")
            nn = mlp_data["model"]
            # Approximate feature importance by input-layer absolute weight sums
            try:
                import numpy as _np
                first_dense_W = None
                for layer in nn.layers:
                    if hasattr(layer, 'get_weights'):
                        weights = layer.get_weights()
                        if len(weights) == 2:  # Dense
                            first_dense_W = weights[0]
                            break
                if first_dense_W is None:
                    fi = {feat: 0.0 for feat in features}
                else:
                    w = _np.array(first_dense_W)
                    scores = _np.sum(_np.abs(w), axis=1)
                    scores = _np.nan_to_num(scores, nan=0.0, posinf=0.0, neginf=0.0)
                    fi = {feat: float(val) for feat, val in zip(features, scores)}
            except Exception:
                fi = {feat: 0.0 for feat in features}
            return ShapSummaryResponse(feature_importance=dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)))

        raise HTTPException(status_code=400, detail=f"Unsupported model {request.model}")
        
    except Exception as e:
        logger.error(f"Error computing feature importance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/explain/shap-local", response_model=ShapLocalResponse)
async def shap_local(request: ShapLocalRequest):
    """Local SHAP explanations are disabled for all models."""
    raise HTTPException(status_code=400, detail="Local SHAP explanations are disabled for all models")


@app.post("/api/explain/pdp", response_model=PDPResponse)
async def compute_pdp(request: PDPRequest):
    """Compute Partial Dependence Plots."""
    try:
        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
        
        # Get training data (respect result filters if provided)
        if request.filters:
            df = data_manager.apply_filters(request.filters)
        else:
            df = data_manager.apply_filters(data_manager.current_filters) if data_manager.current_filters else data_manager.df
        sample_df = data_manager.get_training_sample(df)
        X_train = sample_df[features]
        
        # Get model/pipeline
        if request.model == "mlp":
            # For MLP, we'll skip PDP as it's complex
            return PDPResponse(pdp_data={})
        else:
            pipeline = model_manager.pipelines.get(request.model)
            if not pipeline:
                raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")
            
            # For PDP, we can use the full pipeline
            model = pipeline
        
        # Compute PDP
        result = explainability_manager.compute_pdp(
            request.model,
            model,
            X_train,
            features,
            request.features,
            request.grid_size
        )
        
        return PDPResponse(pdp_data=result)
        
    except Exception as e:
        logger.error(f"Error computing PDP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trace/ensemble", response_model=EnsembleTraceResponse)
async def trace_ensemble(request: EnsembleTraceRequest):
    """Trace boosting/bagging contributions per tree for RF/XGB. If row provided, compute for that instance; otherwise global example."""
    try:
        if request.model not in ["rf", "xgb"]:
            raise HTTPException(status_code=400, detail=f"Ensemble trace not supported for {request.model}")

        features = model_manager.feature_configs.get(request.model)
        if not features:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")

        pipeline = model_manager.pipelines.get(request.model)
        if not pipeline:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not trained")

        model = pipeline.named_steps['classifier']

        if request.model == 'rf':
            # For RF, compute per-tree probability and average
            if request.row:
                import numpy as _np
                df = pd.DataFrame([request.row])
                for f in features:
                    if f not in df.columns:
                        df[f] = 0
                Xp = pipeline.named_steps['preprocessor'].transform(df[features])
                per_tree = [_estimator.predict_proba(Xp)[:, 1][0] for _estimator in model.estimators_]
                final_proba = float(_np.mean(per_tree))
            else:
                per_tree = None
                final_proba = None
            return EnsembleTraceResponse(model='rf', num_trees=len(model.estimators_), per_tree=per_tree, final_proba=final_proba)

        # XGBoost: margin per tree via pred_contrib or pred_leaf contributions
        import numpy as _np
        booster = model.get_booster()
        num_trees = len(booster.get_dump())
        final_margin = None
        per_tree = None
        if request.row:
            df = pd.DataFrame([request.row])
            for f in features:
                if f not in df.columns:
                    df[f] = 0
            Xp = pipeline.named_steps['preprocessor'].transform(df[features])
            dmatrix = xgb.DMatrix(Xp, feature_names=features)
            # Predict with output_margin=True yields sum of trees margins; get per-tree via pred_leaf and tree SHAP approx
            # Simpler: use pred_contribs to get per-feature contributions and base score; approximate per-tree with staged margin
            margins = booster.predict(dmatrix, output_margin=True, pred_contribs=False, validate_features=False, training=False, iteration_range=(0, num_trees))
            # margins shape (n_samples,) as full sum; fallback to staged as not exposed → use sklearn API staged_predict if available
            try:
                sklearn_api = model
                staged = list(sklearn_api.staged_predict_proba(Xp))
                # Convert staged predicted proba to incremental contributions in logit space (approx)
                per_tree = []
                prev_logit = 0.0
                for proba_step in staged:
                    p = float(proba_step[0, 1])
                    logit = float(_np.log(p / (1 - p + 1e-10)))
                    per_tree.append(logit - prev_logit)
                    prev_logit = logit
                final_margin = prev_logit
            except Exception:
                per_tree = None
                final_margin = float(_np.mean(margins)) if hasattr(margins, '__len__') else float(margins)
        return EnsembleTraceResponse(model='xgb', num_trees=num_trees, per_tree=per_tree, final_margin=final_margin, final_proba=float(1/(1+_np.exp(-final_margin))) if final_margin is not None else None)

    except Exception as e:
        logger.error(f"Error tracing ensemble: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model/architecture", response_model=ModelArchitectureResponse)
async def get_model_architecture(model: str):
    """Return model architecture details for visualization (currently MLP only)."""
    try:
        if model != "mlp":
            raise HTTPException(status_code=400, detail="Architecture available only for MLP")
        mlp = model_manager.models.get("mlp")
        if not isinstance(mlp, dict) or "model" not in mlp:
            raise HTTPException(status_code=400, detail="MLP model not trained")
        nn = mlp["model"]
        # Infer architecture
        input_size = None
        hidden_layers = []
        output_size = 1
        for layer in nn.layers:
            cfg = getattr(layer, 'get_config', lambda: {})()
            class_name = getattr(layer, '__class__', type('x', (), {})).__name__
            if class_name.lower() == 'inputlayer':
                shp = cfg.get('batch_input_shape') or cfg.get('input_shape')
                if shp:
                    # batch_input_shape: (None, features)
                    input_size = int(shp[-1])
            elif class_name.lower() == 'dense':
                units = int(cfg.get('units', 0))
                # Assume last dense is output
                hidden_layers.append(units)
        if hidden_layers:
            output_size = hidden_layers[-1]
            # Remove output layer from hidden list
            hidden_layers = hidden_layers[:-1]
        if input_size is None:
            input_size = len(model_manager.feature_configs.get("mlp", []))
        return ModelArchitectureResponse(
            model='mlp',
            input_size=input_size,
            hidden_layers=hidden_layers,
            output_size=1
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model architecture: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
