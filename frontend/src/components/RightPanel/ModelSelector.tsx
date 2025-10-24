import { useStore } from '@/state/useStore';
import { ModelType } from '@/types/api';

const models: { value: ModelType; label: string; description: string }[] = [
  {
    value: 'logistic',
    label: 'Logistic Regression',
    description: 'Linear model with sigmoid activation',
  },
  {
    value: 'rf',
    label: 'Random Forest',
    description: 'Ensemble of decision trees',
  },
  {
    value: 'mlp',
    label: 'Neural Network',
    description: 'Multi-layer perceptron',
  },
];

export function ModelSelector() {
  const selectedModel = useStore((state) => state.selectedModel);
  const setModel = useStore((state) => state.setModel);
  const trainedModels = useStore((state) => state.trainedModels);
  const modelMetrics = useStore((state) => state.modelMetrics);
  const isTraining = useStore((state) => state.isTraining);
  const clearSelectedApplicant = useStore((state) => (state as any).clearSelectedApplicant);

  const handleModelChange = (model: ModelType) => {
    if (!isTraining) {
      setModel(model);
    }
  };

  const getModelStatus = (model: ModelType) => {
    if (trainedModels.has(model)) {
      const metrics = modelMetrics[model];
      if (metrics?.auc) {
        return `AUC: ${metrics.auc.toFixed(3)}`;
      }
      return 'Trained';
    }
    return 'Not trained';
  };

  const getStatusColor = (model: ModelType) => {
    if (trainedModels.has(model)) {
      return 'text-green-600';
    }
    return 'text-gray-400';
  };

  return (
    <div>
      {/* Compact inline model controls */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {models.map((model) => (
          <button
            key={model.value}
            onClick={() => handleModelChange(model.value)}
            disabled={isTraining}
            className={`
              px-2 py-1 rounded border text-xs transition-all
              ${
                selectedModel === model.value
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                  : 'border-gray-300 bg-white hover:border-gray-300 text-gray-700'
              }
              ${isTraining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="font-medium">{model.label}</span>
            <span className={`ml-2 ${getStatusColor(model.value)}`}>{getModelStatus(model.value)}</span>
          </button>
        ))}
        <button
          className="ml-auto px-2 py-1 rounded border text-xs text-gray-700 hover:border-gray-400"
          onClick={() => clearSelectedApplicant?.()}
        >
          Switch to Global
        </button>
      </div>
      {/* Training notice */}
      {!trainedModels.has(selectedModel) && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ This model needs to be trained. Use the Data Explorer to set training data.
          </p>
        </div>
      )}
    </div>
  );
}
