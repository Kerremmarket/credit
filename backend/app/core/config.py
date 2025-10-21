"""Configuration settings for the application."""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
CACHE_DIR = BASE_DIR / "cache"

# Create directories if they don't exist
for dir_path in [DATA_DIR, MODELS_DIR, CACHE_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Demo mode settings (for CPU-optimized performance)
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

if DEMO_MODE:
    MAX_TRAINING_ROWS = 20000  # Sample size for training
    MLP_EPOCHS = 10  # Fewer epochs for faster training
    MLP_HIDDEN = [64, 32]  # Smaller architecture
    SHAP_MAX_SAMPLES = 1000  # Fewer samples for SHAP
    PDP_GRID_SIZE = 20  # Smaller grid for PDP
else:
    # Full settings for production/GPU environments
    MAX_TRAINING_ROWS = 150000
    MLP_EPOCHS = 50
    MLP_HIDDEN = [256, 128, 64]
    SHAP_MAX_SAMPLES = 10000
    PDP_GRID_SIZE = 50

# Model settings
RANDOM_STATE = 42
TEST_SIZE = 0.2

# Cache settings
CACHE_ENABLED = True
CACHE_TTL = 3600  # 1 hour in seconds

# CORS settings
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Feature columns (excluding target)
FEATURE_COLUMNS = [
    "RevolvingUtilizationOfUnsecuredLines",
    "age",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "DebtRatio",
    "MonthlyIncome",
    "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate",
    "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfDependents"
]

TARGET_COLUMN = "SeriousDlqin2yrs"



