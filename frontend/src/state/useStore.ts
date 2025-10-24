// Zustand store for global state management

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DataLoadResponse,
  ExemplarRow,
  ModelType,
  TrainResponse,
  ShapSummaryResponse,
  ShapLocalResponse,
} from '@/types/api';
import { api } from '@/lib/api';

interface DataSlice {
  // Dataset state
  datasetMeta?: DataLoadResponse;
  exemplars: ExemplarRow[];
  neighbors: ExemplarRow[];
  selectedApplicant?: ExemplarRow;
  pinnedApplicants: ExemplarRow[];
  
  // Actions
  loadDataset: () => Promise<void>;
  loadExemplars: (features?: string[]) => Promise<void>;
  selectApplicant: (applicant: ExemplarRow) => void;
  clearSelectedApplicant: () => void;
  togglePinApplicant: (applicant: ExemplarRow) => void;
}

interface ConfigSlice {
  // Model configuration
  selectedModel: ModelType;
  selectedFeatures: string[];
  // Training filters removed from Data Explorer scope
  filters: Record<string, [number, number]>;
  isTraining: boolean;
  demoMode: boolean;
  // Model parameters
  rfTrees: number;
  mlpNeurons: number[];
  
  // Actions
  setModel: (model: ModelType) => void;
  setFeatures: (features: string[]) => void;
  updateFilter: (feature: string, range: [number, number]) => void;
  clearFilters: () => void;
  setRfTrees: (trees: number) => void;
  setMlpNeurons: (neurons: number[]) => void;
}

interface ModelSlice {
  // Model state
  trainedModels: Set<ModelType>;
  modelMetrics: Record<ModelType, TrainResponse['metrics']>;
  modelConfusion: Record<ModelType, number[][]>;
  modelFeatureImportance: Record<ModelType, Record<string, number> | undefined>;
  predictions: Record<string, number>;
  
  // Actions
  trainModel: () => Promise<void>;
  predictForApplicant: (applicant: ExemplarRow) => Promise<number>;
}

interface ExplainSlice {
  // Explanation state
  shapSummary?: ShapSummaryResponse;
  shapLocal?: ShapLocalResponse;
  forwardTrace?: any;
  treePath?: any;
  pdpData?: any;
  
  // Actions
  loadShapSummary: () => Promise<void>;
  loadShapLocal: (applicant: ExemplarRow) => Promise<void>;
  loadForwardTrace: (applicant: ExemplarRow) => Promise<void>;
  loadTreePath: (applicant: ExemplarRow) => Promise<void>;
}

interface ResultFilterSlice {
  // Post-training result filters used by Data Explorer
  resultFilters: Record<string, [number, number]>;
  setResultFilter: (feature: string, range: [number, number]) => void;
  clearResultFilters: () => void;
}

type StoreState = DataSlice & ConfigSlice & ModelSlice & ExplainSlice & ResultFilterSlice;

export const useStore = create<StoreState>()(
  devtools(
    (set, get) => ({
      // Data slice initial state
      exemplars: [],
      neighbors: [],
      pinnedApplicants: [],
      
      // Config slice initial state
      selectedModel: 'logistic',
      selectedFeatures: [],
      filters: {},
      // Result filters (for post-training exploration)
      resultFilters: {},
      isTraining: false,
      demoMode: true,
      // Model parameters
      rfTrees: 100,
      mlpNeurons: [16, 16],
      
      // Model slice initial state
      trainedModels: new Set(),
      modelMetrics: {},
      modelConfusion: {},
      modelFeatureImportance: {},
      predictions: {},
      
      // Data actions
      loadDataset: async () => {
        try {
          const data = await api.loadData();
          set({ 
            datasetMeta: data,
            // Require the user to explicitly select features first
            selectedFeatures: [],
          });
        } catch (error) {
          console.error('Failed to load dataset:', error);
        }
      },
      
      loadExemplars: async (features) => {
        try {
          const response = await api.getExemplars(10, features);
          set({ 
            exemplars: response.exemplars,
            neighbors: response.neighbors,
          });
        } catch (error) {
          console.error('Failed to load exemplars:', error);
        }
      },
      
      selectApplicant: (applicant) => {
        set({ selectedApplicant: applicant });
      },
      clearSelectedApplicant: () => {
        set({ 
          selectedApplicant: undefined,
          // Clear per-applicant artifacts so global view is stable
          shapLocal: undefined,
          forwardTrace: undefined,
          treePath: undefined,
        });
      },
      
      togglePinApplicant: (applicant) => {
        const { pinnedApplicants } = get();
        const isPinned = pinnedApplicants.some(
          (a) => a.row_index === applicant.row_index
        );
        
        if (isPinned) {
          set({
            pinnedApplicants: pinnedApplicants.filter(
              (a) => a.row_index !== applicant.row_index
            ),
          });
        } else if (pinnedApplicants.length < 3) {
          set({ pinnedApplicants: [...pinnedApplicants, applicant] });
        }
      },
      
      // Config actions
      setModel: (model) => {
        set({ selectedModel: model });
      },
      
      setFeatures: (features) => {
        set({ selectedFeatures: features });
        // Invalidate trained models when features change
        set({ trainedModels: new Set() });
      },
      
      updateFilter: (feature, range) => {
        set((state) => {
          const next = { ...state.filters } as Record<string, [number, number]>;
          const shouldRemove =
            !range ||
            !Array.isArray(range) ||
            range.length !== 2 ||
            !Number.isFinite(range[0]) ||
            !Number.isFinite(range[1]);

        if (shouldRemove) {
            delete (next as any)[feature];
          } else {
            next[feature] = range;
          }
          return { filters: next };
        });
      },
      
      clearFilters: () => {
        set({ filters: {} });
      },
      
      setRfTrees: (trees) => {
        set({ rfTrees: trees });
        // Invalidate trained models when parameters change
        set({ trainedModels: new Set() });
      },
      
      setMlpNeurons: (neurons) => {
        set({ mlpNeurons: neurons });
        // Invalidate trained models when parameters change
        set({ trainedModels: new Set() });
      },

      // Result filter handlers (used in Data Explorer)
      setResultFilter: (feature: string, range: [number, number]) => {
        set((state) => {
          const next = { ...(state as any).resultFilters } as Record<string, [number, number]>;
          const invalid = !range || !Array.isArray(range) || range.length !== 2 || !Number.isFinite(range[0]) || !Number.isFinite(range[1]);
          if (invalid) delete (next as any)[feature]; else next[feature] = range;
          return { resultFilters: next } as Partial<StoreState> as StoreState;
        });
      },
      clearResultFilters: () => set({ resultFilters: {} } as Partial<StoreState> as StoreState),
      
      // Model actions
      trainModel: async () => {
        const { selectedModel, selectedFeatures, filters, rfTrees, mlpNeurons } = get();
        
        if (selectedFeatures.length === 0) {
          console.error('No features selected');
          return;
        }
        
        set({ isTraining: true });
        
        try {
          const response = await api.trainModel({
            model: selectedModel,
            feature_config: selectedFeatures,
            filters,
            test_size: 0.2,
            random_state: 42,
            scale_numeric: true,
            n_estimators: selectedModel === 'rf' ? rfTrees : undefined,
            hidden_layers: selectedModel === 'mlp' ? mlpNeurons : undefined,
          });
          
          set((state) => ({
            trainedModels: new Set([...state.trainedModels, selectedModel]),
            modelMetrics: {
              ...state.modelMetrics,
              [selectedModel]: response.metrics,
            },
            modelConfusion: {
              ...state.modelConfusion,
              [selectedModel]: response.confusion_matrix as unknown as number[][],
            },
            modelFeatureImportance: {
              ...state.modelFeatureImportance,
              [selectedModel]: response.feature_importance,
            },
          }));
          
          // Reload exemplars after training
          await get().loadExemplars(selectedFeatures);
          
          // Clear cached explanations
          set({ shapSummary: undefined, shapLocal: undefined });
          
        } catch (error) {
          console.error('Failed to train model:', error);
        } finally {
          set({ isTraining: false });
        }
      },
      
      predictForApplicant: async (applicant) => {
        const { selectedModel, trainedModels } = get();
        
        if (!trainedModels.has(selectedModel)) {
          throw new Error('Model not trained');
        }
        
        const response = await api.predict({
          model: selectedModel,
          rows: [applicant.feature_values],
        });
        
        const prediction = response.predictions[0];
        
        set((state) => ({
          predictions: {
            ...state.predictions,
            [`${selectedModel}_${applicant.row_index}`]: prediction,
          },
        }));
        
        return prediction;
      },
      
      // Explain actions
      loadShapSummary: async () => {
        const { selectedModel, trainedModels } = get();
        
        if (!trainedModels.has(selectedModel) || selectedModel === 'rf') {
          // SHAP disabled for random forest
          set({ shapSummary: undefined });
          return;
        }
        
        try {
          const { resultFilters } = get() as any;
          const response = await api.getShapSummary(selectedModel, 1000, resultFilters);
          set({ shapSummary: response });
        } catch (error) {
          console.error('Failed to load SHAP summary:', error);
        }
      },
      
      loadShapLocal: async () => {
        // Local SHAP disabled for all models
        set({ shapLocal: undefined });
        return;
      },
      
      loadForwardTrace: async (applicant) => {
        const { selectedModel, trainedModels } = get();
        
        if (!trainedModels.has(selectedModel) || 
            (selectedModel !== 'logistic' && selectedModel !== 'mlp')) {
          return;
        }
        
        try {
          const response = await api.traceForward(
            selectedModel,
            applicant.feature_values
          );
          set({ forwardTrace: response });
        } catch (error) {
          console.error('Failed to load forward trace:', error);
        }
      },
      
      loadTreePath: async (applicant) => {
        const { selectedModel, trainedModels } = get();
        
        if (!trainedModels.has(selectedModel) || 
            (selectedModel !== 'rf')) {
          return;
        }
        
        try {
          const response = await api.traceTreePath(
            selectedModel,
            applicant.feature_values,
            true
          );
          set({ treePath: response });
        } catch (error) {
          console.error('Failed to load tree path:', error);
        }
      },
    })
  )
);
