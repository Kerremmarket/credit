"""Pipeline construction for different models."""
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from typing import List, Optional


def create_preprocessor(
    numeric_features: List[str],
    scale: bool = True
) -> ColumnTransformer:
    """Create a preprocessor for numeric features."""
    
    # Numeric pipeline
    numeric_steps = [
        ('imputer', SimpleImputer(strategy='median'))
    ]
    
    if scale:
        numeric_steps.append(('scaler', StandardScaler()))
    
    numeric_pipeline = Pipeline(steps=numeric_steps)
    
    # Combine pipelines
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_pipeline, numeric_features)
        ],
        remainder='passthrough'  # Keep other columns as-is
    )
    
    return preprocessor


def create_model_pipeline(
    model,
    numeric_features: List[str],
    scale: bool = True
) -> Pipeline:
    """Create a complete pipeline with preprocessing and model."""
    
    preprocessor = create_preprocessor(numeric_features, scale)
    
    # Create pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])
    
    return pipeline



