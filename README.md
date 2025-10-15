# Credit Model Observatory

A production-ready interactive web application for visualizing and understanding credit scoring models with real mathematical processes and explanations.

## 🎯 Features

- **Interactive Model Training**: Train multiple ML models (Logistic Regression, Random Forest, XGBoost, Neural Networks) on the Give Me Some Credit dataset
- **Real-time Mathematical Visualizations**: See actual forward passes, decision paths, and mathematical computations
- **SHAP Explanations**: Global and local feature importance with waterfall charts
- **Data Explorer**: Interactive histograms with range selection for training set filtering
- **Feature Selection**: Choose which features to include in model training
- **Applicant Comparison**: Compare predictions for multiple applicants side-by-side
- **Production-Ready**: Dockerized, Railway-deployable, with caching and optimizations

## 🏗️ Architecture

```
erdinc-ML/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── core/    # Core modules (data, models, explanations)
│   │   └── main.py  # API endpoints
│   ├── data/        # Dataset location
│   ├── models/      # Trained model storage
│   └── cache/       # Computation cache
└── frontend/        # React + Vite frontend
    └── src/
        ├── components/  # UI components
        ├── state/      # Zustand store
        └── lib/        # API client
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Kaggle account (for dataset download)

### 1. Get the Dataset

```bash
# Set up Kaggle credentials
mkdir ~/.kaggle
# Download kaggle.json from https://www.kaggle.com/account
mv ~/Downloads/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# Download dataset
cd backend/data
kaggle competitions download -c GiveMeSomeCredit
unzip GiveMeSomeCredit.zip
```

### 2. Start Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Backend will be available at http://localhost:8000

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:5173

## 📊 Using the Application

1. **Data Explorer Tab**: 
   - View feature distributions
   - Set range filters by dragging on histograms
   - Click "Set as Training Set & Train Model"

2. **Features Tab**:
   - Select which features to use for training
   - Changes require model retraining

3. **Applicants Tab**:
   - View exemplar and neighbor samples
   - Click to select an applicant for analysis
   - Pin up to 3 applicants for comparison

4. **Right Panel**:
   - Select model type (Logistic, RF, XGBoost, MLP)
   - View forward pass animations (Logistic/MLP)
   - See decision paths (RF/XGBoost)
   - Analyze SHAP explanations
   - Compare multiple applicants

## 🐳 Docker Deployment

### Build and Run with Docker

```bash
# Backend
cd backend
docker build -t credit-observatory-backend .
docker run -p 8000:8000 credit-observatory-backend

# Frontend
cd frontend
docker build -t credit-observatory-frontend .
docker run -p 80:80 credit-observatory-frontend
```

## 🚂 Railway Deployment

1. Create two Railway services:
   - Backend service (from `backend/` directory)
   - Frontend service (from `frontend/` directory)

2. Set environment variables:
   - Backend: `FRONTEND_ORIGIN=https://your-frontend.railway.app`
   - Frontend: `VITE_API_BASE=https://your-backend.railway.app`

3. Deploy and enjoy!

## ⚡ Performance Optimizations

- **Smart Sampling**: Automatically samples to 20k rows for CPU-friendly training
- **Caching**: SHAP and PDP computations are cached
- **Demo Mode**: Optimized settings for deployment without GPU
- **Lazy Loading**: Components load data on-demand

## 🧮 Mathematical Grounding

All visualizations show real computations:
- **Logistic Regression**: Actual β·x dot products and sigmoid transformation
- **Neural Networks**: Real weight matrices, activations, and forward pass
- **Tree Models**: Actual decision paths with thresholds and inequalities
- **SHAP**: True Shapley values computed from models

## 📝 API Documentation

Visit http://localhost:8000/docs for interactive API documentation.

Key endpoints:
- `POST /api/data/load` - Load dataset
- `POST /api/train` - Train model
- `POST /api/predict` - Get predictions
- `POST /api/trace/forward` - Get forward pass trace
- `POST /api/explain/shap-local` - Get SHAP values

## 🛠️ Development

### Backend Development
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## 📦 Dependencies

### Backend
- FastAPI, uvicorn
- scikit-learn, xgboost, tensorflow
- shap, pandas, numpy
- joblib (caching)

### Frontend
- React, TypeScript, Vite
- Zustand (state management)
- Framer Motion (animations)
- Plotly (charts)
- KaTeX (math rendering)
- Tailwind CSS (styling)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use for educational and commercial purposes.

## 🙏 Acknowledgments

- Dataset: [Give Me Some Credit](https://www.kaggle.com/c/GiveMeSomeCredit) competition on Kaggle
- SHAP library for model explanations
- The open-source ML community
