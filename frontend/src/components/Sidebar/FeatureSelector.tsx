import { useStore } from '@/state/useStore';
import { useState, useMemo } from 'react';
import { abbrev, FEATURE_EXPLANATION } from '@/lib/featureAbbrev';

export function FeatureSelector() {
  const datasetMeta = useStore((state) => state.datasetMeta);
  const selectedFeatures = useStore((state) => state.selectedFeatures);
  const setFeatures = useStore((state) => state.setFeatures);
  const trainedModels = useStore((state) => state.trainedModels);
  const trainModel = useStore((state) => state.trainModel);
  const isTraining = useStore((state) => state.isTraining);
  const selectedModel = useStore((state) => state.selectedModel);
  const mlpNeurons = useStore((state) => state.mlpNeurons);
  
  const [searchTerm, setSearchTerm] = useState('');

  const availableFeatures = useMemo(() => {
    if (!datasetMeta) return [];
    return datasetMeta.feature_list.filter(
      (f) => f !== 'SeriousDlqin2yrs' // Exclude target
    );
  }, [datasetMeta]);

  const filteredFeatures = useMemo(() => {
    return availableFeatures.filter((feature) =>
      feature.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableFeatures, searchTerm]);

  const handleToggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setFeatures(selectedFeatures.filter((f) => f !== feature));
    } else {
      setFeatures([...selectedFeatures, feature]);
    }
  };

  const handleSelectAll = () => {
    setFeatures(filteredFeatures);
  };

  const handleClearAll = () => {
    setFeatures([]);
  };

  // Validate MLP neuron configuration
  const validNeuronOptions = [2, 4, 8, 16];
  const isMlpConfigValid = selectedModel !== 'mlp' || 
    (validNeuronOptions.includes(mlpNeurons[0]) && validNeuronOptions.includes(mlpNeurons[1]));
  
  const canTrain = selectedFeatures.length > 0 && !isTraining && isMlpConfigValid;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 pb-0">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Feature Selection
          </h3>
        </div>

        {/* Search removed per request */}

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleSelectAll}
            className="flex-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="flex-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Warning if models are trained */}
        {trainedModels.size > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Changing features will require retraining models
            </p>
          </div>
        )}
      </div>

      {/* Feature List with scroll */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2 pb-4">
          {filteredFeatures.map((feature) => (
            <label
              key={feature}
              className="flex flex-col p-2 hover:bg-gray-100 rounded cursor-pointer"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feature)}
                  onChange={() => handleToggleFeature(feature)}
                  className="mr-3 h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 flex-1">{abbrev(feature)}</span>
              </div>
              {FEATURE_EXPLANATION[feature] && (
                <div className="ml-7 mt-1 text-xs text-gray-500">
                  {FEATURE_EXPLANATION[feature]}
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Train button - fixed at bottom */}
      <div className="p-4 pt-0 border-t border-gray-200 bg-white">
        <button
          onClick={() => trainModel()}
          disabled={!canTrain}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            !canTrain
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isTraining ? 'Training…' : 'Train with Selected Features'}
        </button>
        {selectedFeatures.length === 0 && (
          <p className="mt-2 text-xs text-red-600 text-center">
            Select at least 1 feature to enable training
          </p>
        )}
        {selectedModel === 'mlp' && !isMlpConfigValid && (
          <p className="mt-2 text-xs text-red-600 text-center">
            Select neurons for both layers to enable training
          </p>
        )}
      </div>
    </div>
  );
}
