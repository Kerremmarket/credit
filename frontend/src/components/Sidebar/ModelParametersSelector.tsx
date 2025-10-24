import { useStore } from '@/state/useStore';

export function ModelParametersSelector() {
  const selectedModel = useStore((s) => s.selectedModel);
  const rfTrees = useStore((s) => s.rfTrees);
  const mlpNeurons = useStore((s) => s.mlpNeurons);
  const setRfTrees = useStore((s) => s.setRfTrees);
  const setMlpNeurons = useStore((s) => s.setMlpNeurons);

  // Only show for RF and MLP
  if (selectedModel !== 'rf' && selectedModel !== 'mlp') {
    return null;
  }

  return (
    <div className="flex-shrink-0 p-4 bg-blue-50 border-b border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Model Parameters
      </h4>

      {selectedModel === 'rf' && (
        <div>
          <label className="block text-xs text-gray-700 mb-2">
            Number of Trees
          </label>
          <div className="flex gap-2">
            {[10, 20, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setRfTrees(n)}
                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                  rfTrees === n
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedModel === 'mlp' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-700 mb-2">
              Layer 1 Neurons
            </label>
            <div className="flex gap-2">
              {[4, 8, 16, 32, 64].map((n) => (
                <button
                  key={n}
                  onClick={() => setMlpNeurons([n, mlpNeurons[1]])}
                  className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                    mlpNeurons[0] === n
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-2">
              Layer 2 Neurons
            </label>
            <div className="flex gap-2">
              {[4, 8, 16, 32, 64].map((n) => (
                <button
                  key={n}
                  onClick={() => setMlpNeurons([mlpNeurons[0], n])}
                  className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                    mlpNeurons[1] === n
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

