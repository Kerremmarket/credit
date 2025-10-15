// API Types matching backend schemas

export interface DataLoadResponse {
  success: boolean;
  feature_list: string[];
  row_count: number;
  na_stats: Record<string, number>;
  quantiles: Record<string, {
    min: number;
    q25: number;
    median: number;
    q75: number;
    max: number;
    mean: number;
    std: number;
  }>;
  target_distribution: Record<string, number>;
}

export interface ExemplarRow {
  row_index: number;
  feature_values: Record<string, any>;
  label?: number;
  risk_score?: number;
}

export interface ExemplarsResponse {
  exemplars: ExemplarRow[];
  neighbors: ExemplarRow[];
}

export interface TrainRequest {
  model: 'logistic' | 'rf' | 'mlp';
  feature_config: string[];
  filters: Record<string, [number, number]>;
  test_size?: number;
  random_state?: number;
  scale_numeric?: boolean;
}

export interface TrainResponse {
  success: boolean;
  model: string;
  metrics: Record<string, number>;
  confusion_matrix: number[][];
  feature_importance?: Record<string, number>;
  train_count: number;
  test_count: number;
  training_time: number;
}

export interface PredictRequest {
  model: string;
  rows: Record<string, any>[];
}

export interface PredictResponse {
  predictions: number[];
  log_odds?: number[];
}

export interface LayerTrace {
  type: string;
  W?: number[][];
  b?: number[];
  z?: number[];
  a?: number[];
  feature_contributions?: Record<string, number>;
  shape?: string;
}

export interface ForwardTraceResponse {
  layers: LayerTrace[];
  logit: number;
  proba: number;
}

export interface TreeNode {
  feature?: string;
  threshold?: number;
  sample_value?: number;
  direction?: string;
  impurity?: number;
  leaf_value?: number;
  is_leaf: boolean;
}

export interface TreeStructure {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  value?: number[][];
  feature_names?: string[];
  feature_abbrev?: Record<string, string>;
}

export interface TreePathResponse {
  path: TreeNode[];
  prediction: number;
  tree?: TreeStructure;
}

export interface ShapSummaryResponse {
  feature_importance: Record<string, number>;
  feature_effects?: Record<string, number[]>;
  base_value?: number;
}

export interface ShapLocalResponse {
  shap_values: Record<string, number>;
  base_value: number;
  prediction: number;
}

export interface PDPResponse {
  pdp_data: Record<string, {
    grid: number[];
    values: number[];
  }>;
}

export type ModelType = 'logistic' | 'rf' | 'mlp';
