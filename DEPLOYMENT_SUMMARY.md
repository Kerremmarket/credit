# Deployment Prep Summary

## Changes Made for Railway Deployment

### 1. Docker Optimization
- **Added `.dockerignore`** files to exclude large dev dependencies:
  - `backend/.dockerignore`: Excludes venv (1.7 GB), cache, data, models
  - `frontend/.dockerignore`: Excludes node_modules (559 MB), dist
  
### 2. Backend Size Optimization
- **Created `requirements-base.txt`**: Lite version without TensorFlow
  - Full (with TF): ~1.2 GB → includes tensorflow, keras, tensorboard, numba, llvmlite
  - Lite (no TF): ~300 MB → Logistic, Random Forest, XGBoost only
  
- **Updated `backend/Dockerfile`** with build arg:
  - `ARG INCLUDE_TF=false`: Builds lite version by default
  - Set to `true` to include TensorFlow/MLP support
  - Added system deps for numpy/scipy (gfortran, openblas, lapack)

### 3. Configuration Files
- **Created `docker-compose.yml`**: For local testing before Railway deployment
  - Backend service with volume mounts for data/models/cache
  - Frontend service with environment variable for API base URL
  
- **Created `.gitignore`**: Prevents committing large files
  - Excludes full datasets (cs-training.csv 7.2 MB, cs-test.csv 4.8 MB)
  - Keeps only small sample (cs-training-sample-small.csv 688 KB)
  - Excludes venv, node_modules, cache, compiled models

### 4. Documentation
- **Created `RAILWAY_DEPLOY.md`**: Complete step-by-step Railway deployment guide
  - Phase 1: Backend deployment with volume setup
  - Phase 2: Frontend deployment with VITE_API_BASE config
  - Phase 3: CORS configuration and verification
  - Phase 4: Optional TensorFlow/MLP enablement
  - Troubleshooting section

---

## Project Size Breakdown

### Before Optimization (local dev)
- Total: 2.2 GB
- Backend venv: 1.7 GB (not deployed)
- Frontend node_modules: 559 MB (not deployed)
- Data: 20 MB
- Models: 4.3 MB
- Cache: 432 KB

### After Optimization (Railway images)
- **Backend lite**: ~300 MB (Logistic, RF, XGBoost)
- **Backend full**: ~1.2 GB (+ MLP with TensorFlow)
- **Frontend**: ~20-60 MB (static assets)
- **Data volume**: ~20 MB (mounted separately)

---

## Deployment Flow

```
┌─────────────────────────────────────────────────┐
│  Railway Project: Credit Model Observatory     │
└─────────────────────────────────────────────────┘
           │
           ├─── Service 1: Backend (API-lite)
           │    ├─ Dockerfile: backend/Dockerfile
           │    ├─ Build arg: INCLUDE_TF=false
           │    ├─ Size: ~300 MB
           │    ├─ Port: 8000
           │    ├─ Volume: /data → datasets
           │    └─ Env: PORT, FRONTEND_ORIGIN, DEMO_MODE
           │
           ├─── Service 2: Frontend (Static)
           │    ├─ Dockerfile: frontend/Dockerfile
           │    ├─ Size: ~20-60 MB
           │    ├─ Port: 80 (nginx)
           │    └─ Env: VITE_API_BASE
           │
           └─── (Optional) Service 3: Backend-MLP
                ├─ Dockerfile: backend/Dockerfile
                ├─ Build arg: INCLUDE_TF=true
                ├─ Size: ~1.2 GB
                └─ Use for neural network training only
```

---

## What You Need to Do in Railway

### Step 1: Push to GitHub (if not already)
```bash
git add .
git commit -m "Prep for Railway deployment"
git push origin main
```

### Step 2: Deploy Backend
1. Railway dashboard → New Project → Deploy from GitHub
2. Select repo → Root directory: `backend`
3. Build Args → Add: `INCLUDE_TF=false`
4. Variables → Add:
   - `PORT=8000`
   - `FRONTEND_ORIGIN=https://your-frontend-url` (fill after frontend deploy)
   - `DEMO_MODE=true`
5. Volumes → Add volume → Mount: `/data`
6. Upload `cs-training-sample-small.csv` to volume
7. Deploy → Note the public URL

### Step 3: Deploy Frontend
1. Same project → New Service → GitHub repo
2. Root directory: `frontend`
3. Variables → Add: `VITE_API_BASE=https://<backend-url>`
4. Deploy → Note the public URL

### Step 4: Update CORS
1. Go to backend service → Variables
2. Update `FRONTEND_ORIGIN` with actual frontend URL
3. Redeploy

### Step 5: Test
- Visit frontend URL
- Check health: `<backend-url>/api/health`
- Train a model (Logistic or XGBoost)

---

## Local Testing Before Railway

```bash
# Test lite build (no TensorFlow)
docker compose up --build

# Test with TensorFlow
# Edit docker-compose.yml: INCLUDE_TF: "true"
docker compose up --build

# Access
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Health: http://localhost:8000/api/health
```

---

## Cost Estimation (Railway)

**Lite Deployment** (Recommended):
- Backend lite (~300 MB) + Frontend (~50 MB)
- Total: ~350 MB runtime
- Should fit in Railway free tier or $5/month Hobby plan

**Full Deployment** (With MLP):
- Backend full (~1.2 GB) + Frontend (~50 MB)
- Total: ~1.25 GB runtime
- May require Pro plan ($20/month) depending on traffic

---

## Next Steps After Deployment

1. **Custom Domain** (Optional):
   - Add custom domain in Railway settings
   - Update CORS and VITE_API_BASE accordingly

2. **Data Management**:
   - Upload full dataset to volume if needed
   - Update path in UI: `/data/cs-training.csv`

3. **Model Persistence**:
   - Mount `/app/models` to a volume for trained models
   - Mount `/app/cache` for SHAP cache (optional)

4. **Monitoring**:
   - Set up Railway metrics dashboard
   - Monitor logs for errors
   - Check response times

5. **Enable MLP** (When Ready):
   - Either rebuild backend with `INCLUDE_TF=true`
   - Or create separate api-mlp service

---

## Files Changed/Created

✅ `backend/.dockerignore`
✅ `backend/requirements-base.txt`
✅ `backend/Dockerfile` (updated with build arg)
✅ `frontend/.dockerignore`
✅ `docker-compose.yml`
✅ `.gitignore`
✅ `RAILWAY_DEPLOY.md`
✅ `DEPLOYMENT_SUMMARY.md` (this file)

All ready for Railway! 🚀

