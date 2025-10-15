// API client for backend communication

import type {
  DataLoadResponse,
  ExemplarsResponse,
  TrainRequest,
  TrainResponse,
  PredictRequest,
  PredictResponse,
  ForwardTraceResponse,
  TreePathResponse,
  ShapSummaryResponse,
  ShapLocalResponse,
  PDPResponse,
} from '@/types/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.detail || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Health check
  async health(): Promise<{ status: string; demo_mode: boolean }> {
    return this.fetch('/api/health');
  }

  // Data operations
  async loadData(path = 'data/cs-training-sample-small.csv'): Promise<DataLoadResponse> {
    return this.fetch('/api/data/load', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async getExemplars(
    k = 10,
    features?: string[]
  ): Promise<ExemplarsResponse> {
    return this.fetch('/api/data/exemplars', {
      method: 'POST',
      body: JSON.stringify({ k, features }),
    });
  }

  // Model operations
  async trainModel(request: TrainRequest): Promise<TrainResponse> {
    return this.fetch('/api/train', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async predict(request: PredictRequest): Promise<PredictResponse> {
    return this.fetch('/api/predict', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Trace operations
  async traceForward(
    model: string,
    row: Record<string, any>
  ): Promise<ForwardTraceResponse> {
    return this.fetch('/api/trace/forward', {
      method: 'POST',
      body: JSON.stringify({ model, row }),
    });
  }

  async traceTreePath(
    model: string,
    row: Record<string, any>,
    fullTree = false
  ): Promise<TreePathResponse> {
    return this.fetch('/api/trace/treepath', {
      method: 'POST',
      body: JSON.stringify({ model, row, full_tree: fullTree }),
    });
  }

  // Explanation operations
  async getShapSummary(
    model: string,
    maxSamples = 1000,
    filters?: Record<string, [number, number]>
  ): Promise<ShapSummaryResponse> {
    return this.fetch('/api/explain/shap-summary', {
      method: 'POST',
      body: JSON.stringify({ model, max_samples: maxSamples, filters }),
    });
  }

  async getShapLocal(
    model: string,
    row: Record<string, any>
  ): Promise<ShapLocalResponse> {
    return this.fetch('/api/explain/shap-local', {
      method: 'POST',
      body: JSON.stringify({ model, row }),
    });
  }

  async getModelArchitecture(model: string): Promise<{ model: string; input_size: number; hidden_layers: number[]; output_size: number; }> {
    const params = new URLSearchParams({ model });
    return this.fetch(`/api/model/architecture?${params.toString()}`);
  }

  async getPDP(
    model: string,
    features: string[],
    gridSize = 30,
    filters?: Record<string, [number, number]>
  ): Promise<PDPResponse> {
    return this.fetch('/api/explain/pdp', {
      method: 'POST',
      body: JSON.stringify({ model, features, grid_size: gridSize, filters }),
    });
  }

  async traceEnsemble(
    model: string,
    row?: Record<string, any>
  ): Promise<{ model: string; num_trees: number; per_tree?: number[]; final_margin?: number; final_proba?: number }>{
    return this.fetch('/api/trace/ensemble', {
      method: 'POST',
      body: JSON.stringify({ model, row }),
    });
  }
}

export const api = new ApiClient();
