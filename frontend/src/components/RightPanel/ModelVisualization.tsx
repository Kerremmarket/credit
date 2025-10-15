import { useEffect, useState } from 'react';
import { useStore } from '@/state/useStore';
import { LogisticVisualization } from './visualizations/LogisticVisualization';
import { NeuralNetworkVisualization } from './visualizations/NeuralNetworkVisualization';
import { TreePathVisualization } from './visualizations/TreePathVisualization';

export function ModelVisualization() {
  const selectedModel = useStore((state) => state.selectedModel);
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const trainedModels = useStore((state) => state.trainedModels);
  const loadForwardTrace = useStore((state) => state.loadForwardTrace);
  const loadTreePath = useStore((state) => state.loadTreePath);
  const [ensembleTrace, setEnsembleTrace] = useState<any | undefined>(undefined);
  const predictForApplicant = useStore((state) => state.predictForApplicant);

  useEffect(() => {
    if (!selectedApplicant || !trainedModels.has(selectedModel)) return;

    // Load appropriate trace based on model type
    if (selectedModel === 'logistic' || selectedModel === 'mlp') {
      loadForwardTrace(selectedApplicant);
    } else if (selectedModel === 'rf') {
      loadTreePath(selectedApplicant);
      (async () => {
        const { api } = await import('@/lib/api');
        try {
          const tr = await api.traceEnsemble(selectedModel, selectedApplicant.feature_values);
          setEnsembleTrace(tr);
        } catch {}
      })();
    }

    // Also get prediction
    predictForApplicant(selectedApplicant);
  }, [selectedModel, selectedApplicant, trainedModels]);

  if (!trainedModels.has(selectedModel)) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Model not trained yet</p>
      </div>
    );
  }

  if (!selectedApplicant) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No applicant selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedModel === 'logistic' && <LogisticVisualization />}
      {selectedModel === 'mlp' && <NeuralNetworkVisualization />}
      {selectedModel === 'rf' && <TreePathVisualization />}
      {selectedModel === 'rf' && ensembleTrace?.per_tree && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Per-tree Contribution</h4>
          <div className="text-xs text-gray-600 mb-2">{ensembleTrace.num_trees} trees</div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-2">Tree</th>
                  <th className="text-left py-1 px-2">Proba</th>
                </tr>
              </thead>
              <tbody>
                {ensembleTrace.per_tree.slice(0, 50).map((v: number, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 px-2">{i + 1}</td>
                    <td className="py-1 px-2 font-mono">{v.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ensembleTrace.per_tree.length > 50 && (
              <div className="text-[10px] text-gray-400 mt-1">Showing first 50 trees…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
