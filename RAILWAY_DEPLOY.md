# Railway Deployment Guide

## Overview
This project deploys as two separate services on Railway:
1. **Frontend** (Vite → Nginx static): ~20-60 MB
2. **Backend** (FastAPI + ML): ~300 MB (lite) or ~1.2 GB (with TensorFlow)

---

## Phase 1: Deploy Backend (API-lite, no TensorFlow)

### 1.1 Create Backend Service
1. In Railway dashboard: **New Project** → **Deploy from GitHub repo**
2. Select this repository
3. Root directory: `backend`
4. Railway will auto-detect the Dockerfile

### 1.2 Configure Build Arguments
- In Railway service settings → **Variables** → **Build Args**:
  ```
  INCLUDE_TF=false
  ```
  (This builds the lite version without TensorFlow; final image ~300 MB)

### 1.3 Set Environment Variables
In Railway service → **Variables**:
```bash
PORT=8000
FRONTEND_ORIGIN=https://your-frontend-url.railway.app
DEMO_MODE=true
```
(You'll update `FRONTEND_ORIGIN` after deploying frontend)

### 1.4 Add Volume for Data
1. In service settings → **Volumes** → **Add Volume**
2. Mount point: `/data`
3. Upload your dataset files to the volume:
   - `cs-training-sample-small.csv` (688 KB)
   - `cs-training.csv` (7.2 MB) if needed
   - Or place files via Railway CLI / file browser

### 1.5 Deploy
- Railway will build and deploy
- Note the public URL: `https://<backend-service>.railway.app`

---

## Phase 2: Deploy Frontend

### 2.1 Create Frontend Service
1. **New Service** in same project → GitHub repo
2. Root directory: `frontend`
3. Railway auto-detects Dockerfile (multi-stage: node build → nginx)

### 2.2 Set Environment Variables
In frontend service → **Variables**:
```bash
VITE_API_BASE=https://<backend-service>.railway.app
```
(Use the backend URL from Phase 1)

### 2.3 Deploy
- Railway builds static assets and serves via nginx
- Note the public URL: `https://<frontend-service>.railway.app`

### 2.4 Update Backend CORS
Go back to backend service → **Variables** → Update:
```bash
FRONTEND_ORIGIN=https://<frontend-service>.railway.app
```
Redeploy backend.

---

## Phase 3: Verify Deployment

1. **Health check**: Visit `https://<backend-service>.railway.app/api/health`
   - Should return: `{"status":"ok","demo_mode":true}`

2. **Open frontend**: Visit `https://<frontend-service>.railway.app`
   - Should load the Credit Model Observatory UI
   - Check browser console for any CORS or API errors

3. **Test functionality**:
   - Click "Data Explorer" → should show feature distributions
   - Click "Training" → select features → train a model (Logistic or XGBoost work without TensorFlow)
   - Note: MLP will fail if `INCLUDE_TF=false`; see Phase 4 to enable it

---

## Phase 4 (Optional): Enable Neural Network (MLP)

If you need the MLP model with TensorFlow:

### Option A: Rebuild Backend with TensorFlow
1. Backend service → **Variables** → **Build Args**:
   ```
   INCLUDE_TF=true
   ```
2. Redeploy backend
3. Final image: ~1.2 GB (much larger due to TensorFlow)

### Option B: Separate MLP Service (Recommended for Production)
1. Clone backend service → name it `api-mlp`
2. Set build arg: `INCLUDE_TF=true`
3. Use separate domain or port
4. Update frontend to conditionally route MLP requests to this service
   (Requires minor code change; ask if needed)

---

## Cost & Performance Notes

- **Lite backend** (~300 MB): Supports Logistic, Random Forest, XGBoost
- **Full backend** (~1.2 GB): Adds MLP with TensorFlow
- **Data volume**: ~20 MB for all datasets
- **Frontend**: ~20-60 MB static assets

Railway free tier should handle lite backend + frontend easily. Full TF backend may require paid plan depending on usage.

---

## Troubleshooting

### CORS errors in browser
- Ensure `FRONTEND_ORIGIN` in backend matches exact frontend URL (including https://)
- Check Railway logs for CORS-related messages

### Data file not found
- Ensure files are in `/data` volume mount
- In the UI, when loading data, use path: `/data/cs-training-sample-small.csv`
- Or update `backend/app/core/schemas.py` default path to `/data/...`

### MLP training fails with "Model not supported"
- You built with `INCLUDE_TF=false`
- Either rebuild with `INCLUDE_TF=true` or use Logistic/RF/XGB instead

### Build timeout or OOM
- TensorFlow build can be slow; Railway may need build time increase
- Consider using `INCLUDE_TF=false` for faster, smaller builds

---

## Updating After Deployment

Push code changes to GitHub → Railway auto-redeploys both services.

To change build args or env vars:
1. Update in Railway dashboard
2. Manual redeploy or push a dummy commit to trigger rebuild

---

## Quick Reference

**Backend service:**
- Build arg: `INCLUDE_TF=false` (lite) or `true` (full)
- Port: 8000
- Volume: `/data`
- Env vars: `PORT`, `FRONTEND_ORIGIN`, `DEMO_MODE`

**Frontend service:**
- Env var: `VITE_API_BASE=https://<backend>.railway.app`
- Port: 80 (nginx default)

**Health endpoint:** `https://<backend>.railway.app/api/health`

---

Ready to deploy! 🚀

