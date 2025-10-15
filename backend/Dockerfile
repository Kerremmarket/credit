FROM python:3.11-slim

ARG INCLUDE_TF=true

WORKDIR /app

# Install system dependencies for numpy/scipy/sklearn
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY requirements.txt requirements-base.txt ./

# Install Python dependencies based on build arg
RUN if [ "$INCLUDE_TF" = "true" ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements-base.txt; \
    fi

# Copy application code
COPY . .

ENV PORT=8000

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
