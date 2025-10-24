"""Data loading and processing utilities."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import logging

from .config import DATA_DIR, MAX_TRAINING_ROWS, FEATURE_COLUMNS, TARGET_COLUMN

logger = logging.getLogger(__name__)


class DataManager:
    """Manages dataset loading, filtering, and sampling."""
    
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.scaler = StandardScaler()
        self.current_filters: Dict[str, List[float]] = {}
        
    def load_dataset(self, path: str = "data/cs-training-sample-small.csv") -> Dict[str, Any]:
        """Load and validate the dataset."""
        try:
            full_path = DATA_DIR / path.replace("data/", "")
            if not full_path.exists():
                raise FileNotFoundError(f"Dataset not found at {full_path}")
            
            # Load dataset
            self.df = pd.read_csv(full_path)
            
            # Validate required columns
            if TARGET_COLUMN not in self.df.columns:
                raise ValueError(f"Target column '{TARGET_COLUMN}' not found in dataset")
            
            # Get metadata - use FEATURE_COLUMNS order for consistency
            feature_list = [col for col in FEATURE_COLUMNS if col in self.df.columns]
            row_count = len(self.df)
            na_stats = self.df.isnull().sum().to_dict()
            
            # Calculate quantiles for numeric columns
            quantiles = {}
            for col in self.df.select_dtypes(include=[np.number]).columns:
                quantiles[col] = {
                    "min": float(self.df[col].min()),
                    "q25": float(self.df[col].quantile(0.25)),
                    "median": float(self.df[col].quantile(0.50)),
                    "q75": float(self.df[col].quantile(0.75)),
                    "max": float(self.df[col].max()),
                    "mean": float(self.df[col].mean()),
                    "std": float(self.df[col].std())
                }
            
            # Target distribution
            target_dist = self.df[TARGET_COLUMN].value_counts().to_dict()
            target_dist = {str(k): int(v) for k, v in target_dist.items()}
            
            logger.info(f"Loaded dataset with {row_count} rows and {len(feature_list)} features")
            
            return {
                "success": True,
                "feature_list": feature_list,
                "row_count": row_count,
                "na_stats": na_stats,
                "quantiles": quantiles,
                "target_distribution": target_dist
            }
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            raise
    
    def apply_filters(self, filters: Dict[str, List[float]]) -> pd.DataFrame:
        """Apply feature range filters to the dataset."""
        if self.df is None:
            raise ValueError("No dataset loaded")
        
        filtered_df = self.df.copy()
        
        for feature, (min_val, max_val) in filters.items():
            if feature in filtered_df.columns:
                # Handle NaN values by keeping them
                mask = (
                    filtered_df[feature].isna() |
                    ((filtered_df[feature] >= min_val) & (filtered_df[feature] <= max_val))
                )
                filtered_df = filtered_df[mask]
        
        self.current_filters = filters
        logger.info(f"Applied filters, reduced from {len(self.df)} to {len(filtered_df)} rows")
        
        return filtered_df
    
    def get_training_sample(self, df: pd.DataFrame, max_rows: int = MAX_TRAINING_ROWS) -> pd.DataFrame:
        """Get a stratified sample for training."""
        if len(df) <= max_rows:
            return df
        
        # Stratified sampling to maintain class balance
        try:
            return df.groupby(TARGET_COLUMN, group_keys=False).apply(
                lambda x: x.sample(
                    n=min(len(x), int(max_rows * len(x) / len(df))),
                    random_state=42
                )
            )
        except:
            # Fallback to simple random sampling if stratification fails
            return df.sample(n=max_rows, random_state=42)
    
    def get_exemplars(self, k: int = 10, features: Optional[List[str]] = None) -> Dict[str, List[Dict]]:
        """Get exemplar samples and their neighbors."""
        if self.df is None:
            raise ValueError("No dataset loaded")
        
        df = self.df.copy()
        
        # Use specified features or default
        if features is None:
            features = [col for col in FEATURE_COLUMNS if col in df.columns]
        
        # If precomputed exemplars exist and k==10, load them for fast startup
        try:
            precomp_path = DATA_DIR / "exemplars_10.json"
            if precomp_path.exists() and k == 10:
                import json
                with open(precomp_path, 'r') as f:
                    data = json.load(f)
                file_features = data.get('features', [])
                # Use intersection to avoid missing columns
                use_features = [f for f in file_features if f in df.columns]
                if use_features:
                    features = use_features
                exemplars = []
                for item in data.get('exemplars', [])[:k]:
                    row_index = int(item.get('row_index'))
                    # Build feature_values dict from available features
                    feature_values = {feat: item.get(feat) for feat in features}
                    exemplars.append({
                        "row_index": row_index,
                        "feature_values": feature_values,
                        "label": int(item.get(TARGET_COLUMN, item.get('label'))) if item.get('label') is not None else None
                    })
                # Compute neighbors: 3 nearest per exemplar in standardized space
                df_clean = df[features].fillna(df[features].median())
                X_scaled = self.scaler.fit_transform(df_clean)
                neighbors: List[Dict] = []
                for ex in exemplars:
                    idx = ex["row_index"]
                    if idx < 0 or idx >= len(df):
                        continue
                    x = X_scaled[idx]
                    dists = np.linalg.norm(X_scaled - x, axis=1)
                    # Exclude the exemplar itself
                    nn_indices = np.argsort(dists)[1:4]
                    for ni in nn_indices:
                        nr = df.iloc[int(ni)]
                        neighbors.append({
                            "row_index": int(ni),
                            "feature_values": nr[features].to_dict(),
                            "label": int(nr[TARGET_COLUMN]) if TARGET_COLUMN in nr else None
                        })
                return {"exemplars": exemplars, "neighbors": neighbors}
        except Exception as e:
            logger.warning(f"Failed to load precomputed exemplars, falling back to k-means: {e}")
        
        # Handle missing values for clustering
        df_clean = df[features].fillna(df[features].median())
        
        # Standardize features for clustering
        X_scaled = self.scaler.fit_transform(df_clean)
        
        # Use K-means to find exemplars
        kmeans = KMeans(n_clusters=min(k, len(df_clean)), random_state=42)
        kmeans.fit(X_scaled)
        
        exemplars = []
        neighbors = []
        
        # For each cluster, find the closest point to centroid
        for i in range(kmeans.n_clusters):
            cluster_mask = kmeans.labels_ == i
            cluster_indices = np.where(cluster_mask)[0]
            
            if len(cluster_indices) > 0:
                # Find closest to centroid
                cluster_center = kmeans.cluster_centers_[i]
                distances = np.linalg.norm(X_scaled[cluster_mask] - cluster_center, axis=1)
                exemplar_idx_in_cluster = np.argmin(distances)
                exemplar_idx = cluster_indices[exemplar_idx_in_cluster]
                
                # Add exemplar
                exemplar_row = df.iloc[exemplar_idx]
                exemplars.append({
                    "row_index": int(exemplar_idx),
                    "feature_values": exemplar_row[features].to_dict(),
                    "label": int(exemplar_row[TARGET_COLUMN]) if TARGET_COLUMN in exemplar_row else None
                })
                
                # Find 3-5 neighbors
                neighbor_indices = cluster_indices[distances.argsort()[1:6]]  # Skip the exemplar itself
                for neighbor_idx in neighbor_indices[:3]:  # Take up to 3 neighbors
                    neighbor_row = df.iloc[neighbor_idx]
                    neighbors.append({
                        "row_index": int(neighbor_idx),
                        "feature_values": neighbor_row[features].to_dict(),
                        "label": int(neighbor_row[TARGET_COLUMN]) if TARGET_COLUMN in neighbor_row else None
                    })
        
        return {
            "exemplars": exemplars,
            "neighbors": neighbors
        }
    
    def prepare_train_test_split(
        self, 
        df: pd.DataFrame,
        features: List[str],
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """Prepare train-test split with stratification."""
        # Get feature matrix and target
        X = df[features]
        y = df[TARGET_COLUMN]
        
        # Stratified split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        return X_train, X_test, y_train, y_test


# Global instance
data_manager = DataManager()
