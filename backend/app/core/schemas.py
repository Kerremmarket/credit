"""Pydantic schemas for request/response validation."""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class DataLoadRequest(BaseModel):
    """Request schema for loading dataset."""
    path: str = Field(default="data/cs-training-sample-small.csv", description="Path to CSV file")


class DataLoadResponse(BaseModel):
    """Response schema for dataset loading."""
    success: bool
    feature_list: List[str]
    row_count: int
    na_stats: Dict[str, int]
    quantiles: Dict[str, Dict[str, float]]
    target_distribution: Dict[str, int]


class ExemplarsRequest(BaseModel):
    """Request schema for getting exemplar samples."""
    k: int = Field(default=10, description="Number of exemplars")
    features: Optional[List[str]] = Field(default=None, description="Feature subset")


class ExemplarRow(BaseModel):
    """Schema for an exemplar row."""
    row_index: int
    feature_values: Dict[str, Any]
    label: Optional[int]
    risk_score: Optional[float] = None


class ExemplarsResponse(BaseModel):
    """Response schema for exemplars."""
    exemplars: List[ExemplarRow]
    neighbors: List[ExemplarRow]


class TrainRequest(BaseModel):
    """Request schema for model training."""
    model: str = Field(..., description="Model type: logistic|rf|xgb|mlp")
    feature_config: List[str] = Field(..., description="List of features to use")
    filters: Dict[str, List[float]] = Field(default={}, description="Feature range filters")
    test_size: float = Field(default=0.2, description="Test set proportion")
    random_state: int = Field(default=42, description="Random seed")
    scale_numeric: bool = Field(default=True, description="Whether to scale features")
    # Model-specific parameters
    n_estimators: Optional[int] = Field(default=None, description="Number of trees for RF/XGB")
    hidden_layers: Optional[List[int]] = Field(default=None, description="Hidden layer sizes for MLP")


class TrainResponse(BaseModel):
    """Response schema for model training."""
    success: bool
    model: str
    metrics: Dict[str, float]  # AUC, accuracy, etc.
    confusion_matrix: List[List[int]]
    feature_importance: Optional[Dict[str, float]]
    train_count: int
    test_count: int
    training_time: float


class PredictRequest(BaseModel):
    """Request schema for predictions."""
    model: str
    rows: List[Dict[str, Any]]


class PredictResponse(BaseModel):
    """Response schema for predictions."""
    predictions: List[float]  # Probabilities
    log_odds: Optional[List[float]] = None


class ForwardTraceRequest(BaseModel):
    """Request schema for forward pass tracing."""
    model: str = Field(..., description="Model type: mlp|logistic")
    row: Dict[str, Any]


class LayerTrace(BaseModel):
    """Schema for a layer's forward pass trace."""
    type: str
    W: Optional[List[List[float]]] = None  # Weight matrix
    b: Optional[List[float]] = None  # Bias vector
    z: Optional[List[float]] = None  # Pre-activation
    a: Optional[List[float]] = None  # Post-activation
    feature_contributions: Optional[Dict[str, float]] = None


class ForwardTraceResponse(BaseModel):
    """Response schema for forward pass trace."""
    layers: List[LayerTrace]
    logit: float
    proba: float


class TreePathRequest(BaseModel):
    """Request schema for tree path tracing."""
    model: str = Field(..., description="Model type: rf|xgb")
    row: Dict[str, Any]
    full_tree: bool = Field(default=False, description="If true, include full tree structure")


class TreeNode(BaseModel):
    """Schema for a tree node in the decision path."""
    feature: Optional[str]
    threshold: Optional[float]
    sample_value: Optional[float]
    direction: Optional[str]  # "left" or "right"
    impurity: Optional[float]
    leaf_value: Optional[float]
    is_leaf: bool = False


class TreePathResponse(BaseModel):
    """Response schema for tree path."""
    path: List[TreeNode]
    prediction: float
    tree: Optional[Dict[str, Any]] = None


class ShapSummaryRequest(BaseModel):
    """Request schema for SHAP summary."""
    model: str
    max_samples: int = Field(default=1000, description="Max samples for SHAP")
    filters: Optional[Dict[str, List[float]]] = Field(default=None, description="Result filters for summary")


class ShapSummaryResponse(BaseModel):
    """Response schema for SHAP summary."""
    feature_importance: Dict[str, float]
    feature_effects: Optional[Dict[str, List[float]]] = None


class ShapLocalRequest(BaseModel):
    """Request schema for local SHAP values."""
    model: str
    row: Dict[str, Any]


class ShapLocalResponse(BaseModel):
    """Response schema for local SHAP values."""
    shap_values: Dict[str, float]
    base_value: float
    prediction: float


class PDPRequest(BaseModel):
    """Request schema for PDP/ALE computation."""
    model: str
    features: List[str]
    grid_size: int = Field(default=30, description="Grid resolution")
    filters: Optional[Dict[str, List[float]]] = Field(default=None, description="Result filters for PDP")


class PDPResponse(BaseModel):
    """Response schema for PDP/ALE."""
    pdp_data: Dict[str, Dict[str, List[float]]]  # feature -> {grid, values}


class EnsembleTraceRequest(BaseModel):
    """Request schema for ensemble (boosting/bagging) trace."""
    model: str = Field(..., description="Model type: rf|xgb")
    row: Optional[Dict[str, Any]] = None


class EnsembleTraceResponse(BaseModel):
    """Response schema for ensemble trace."""
    model: str
    num_trees: int
    per_tree: Optional[List[float]] = None  # contribution per tree (margin for xgb, proba for rf)
    final_margin: Optional[float] = None
    final_proba: Optional[float] = None


class ModelArchitectureResponse(BaseModel):
    """Response schema for model architecture."""
    model: str
    input_size: int
    hidden_layers: List[int]
    output_size: int
