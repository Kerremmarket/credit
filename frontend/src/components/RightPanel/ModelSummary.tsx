import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/state/useStore';
import Plot from 'react-plotly.js';
import { GlobalTree } from './visualizations/GlobalTree';
import { NeuralNetworkVisualization } from './visualizations/NeuralNetworkVisualization';
import { RandomForestSchematic } from './visualizations/RandomForestSchematic';
import { abbrev } from '@/lib/featureAbbrev';

export function ModelSummary() {
  const selectedModel = useStore((s) => s.selectedModel);
  const trainedModels = useStore((s) => s.trainedModels);
  const metrics = useStore((s) => s.modelMetrics[selectedModel]);
  const rfFeatureImportance = useStore((s: any) => s.modelFeatureImportance?.[selectedModel]);
  const confusionByModel = useStore((s: any) => s.modelConfusion || {});
  const shapSummary = useStore((s) => s.shapSummary);
  const loadShapSummary = useStore((s) => s.loadShapSummary);
  const resultFilters = useStore((s) => s.resultFilters);
  const selectedFeatures = useStore((s) => s.selectedFeatures);
  const getPDP = useMemo(() => ({
    fetch: async (features: string[]) => {
      // Lazy import to avoid circulars
      const { api } = await import('@/lib/api');
      return api.getPDP(selectedModel, features, 30, resultFilters);
    }
  }), [selectedModel, resultFilters]);
  const [pdp, setPdp] = (window as any).useState?.() || [undefined, () => {}];
  const [treeFull, setTreeFull] = useState<any | undefined>(undefined);
  const [ensembleTrace, setEnsembleTrace] = useState<any | undefined>(undefined);

  useEffect(() => {
    if (trainedModels.has(selectedModel) && !shapSummary) {
      loadShapSummary();
    }
  }, [selectedModel, trainedModels]);

  // Refresh SHAP summary when result filters change
  useEffect(() => {
    if (trainedModels.has(selectedModel)) {
      loadShapSummary();
    }
  }, [trainedModels, selectedModel, JSON.stringify(resultFilters)]);

  useEffect(() => {
    if (!trainedModels.has(selectedModel) || selectedFeatures.length === 0) return;
    // Fetch PDP for top 3 features or selected ones if few
    const top = shapSummary ? Object.keys(shapSummary.feature_importance).slice(0, 3) : selectedFeatures.slice(0, 3);
    getPDP.fetch(top).then((res) => setPdp(res.pdp_data)).catch(() => setPdp(undefined));
  }, [selectedModel, trainedModels, shapSummary, selectedFeatures, resultFilters]);

  useEffect(() => {
    // Load a compact full-tree snapshot for tree models
    (async () => {
      if (!trainedModels.has(selectedModel) || (selectedModel !== 'rf')) {
        setTreeFull(undefined);
        setEnsembleTrace(undefined);
        return;
      }
      const { api } = await import('@/lib/api');
      try {
        const res = await api.traceTreePath(selectedModel, {}, true);
        setTreeFull(res.tree);
      } catch {
        setTreeFull(undefined);
      }
      try {
        const tr = await api.traceEnsemble(selectedModel);
        setEnsembleTrace(tr);
      } catch {
        setEnsembleTrace(undefined);
      }
    })();
  }, [selectedModel, trainedModels]);

  if (!trainedModels.has(selectedModel)) {
    return (
      <div className="p-6 text-center text-gray-500">
        Train a model to see summary metrics and global explanations.
      </div>
    );
  }

  const auc = metrics?.auc?.toFixed?.(3);
  const accuracy = metrics?.accuracy?.toFixed?.(3);
  const avgProba = metrics?.avg_proba_test?.toFixed?.(3);
  const confusion = confusionByModel[selectedModel] as number[][] | undefined;

  const globalImportanceSource: Record<string, number> | undefined =
    shapSummary?.feature_importance || (rfFeatureImportance as Record<string, number> | undefined);

  const globalImportance = globalImportanceSource
    ? Object.entries(globalImportanceSource as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  const barData = globalImportance.length
    ? [{
        x: globalImportance.map(([f]) => abbrev(f)),
        y: globalImportance.map(([_, v]) => v),
        type: 'bar' as const,
        marker: { color: 'rgba(59,130,246,0.8)' },
      }]
    : [];

  return (
    <div className="space-y-4">
      {selectedModel === 'mlp' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Neural Network Architecture</div>
          <NeuralNetworkVisualization />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">AUC</div>
          <div className="text-2xl font-semibold">{auc ?? '—'}</div>
          <p className="mt-2 text-xs text-gray-500 leading-snug">
            Area Under the ROC Curve — measures how well the model separates positive vs. negative cases. 0.5 is random, 1.0 is perfect.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">Accuracy</div>
          <div className="text-2xl font-semibold">{accuracy ?? '—'}</div>
          <p className="mt-2 text-xs text-gray-500 leading-snug">
            Share of test records classified correctly (true positives plus true negatives).
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">Avg Pred. Prob (test)</div>
          <div className="text-2xl font-semibold">{avgProba ?? '—'}</div>
          <p className="mt-2 text-xs text-gray-500 leading-snug">
            Average predicted probability of default across the holdout test set — shows the model’s overall risk level.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Global Feature Importance</div>
        {barData.length ? (
          <>
            <Plot
              data={barData}
              layout={{
                height: 260,
                margin: { t: 10, r: 10, b: 60, l: 40 },
                showlegend: false,
                xaxis: { tickfont: { size: 10 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              className="w-full"
            />
            <p className="mt-3 text-xs text-gray-500 leading-snug">
              Ranks features by their average influence on predictions. Larger bars highlight features that drive the model most.
            </p>
          </>
        ) : (
          <div className="text-gray-500 text-sm">No importance available yet.</div>
        )}
      </div>

      {/* PDP for top features */}
      {pdp && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Partial Dependence</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(pdp).map(([feat, d]) => (
              <Plot
                key={feat}
                data={[{ x: (d as any).grid, y: (d as any).values, type: 'scatter', mode: 'lines', line: { color: 'rgb(99,102,241)' } }]}
                layout={{ height: 220, margin: { t: 20, r: 10, b: 40, l: 40 }, title: { text: feat, font: { size: 12 } }, showlegend: false }}
                config={{ displayModeBar: false, responsive: true }}
                className="w-full"
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-snug">
            Shows how the predicted probability changes as a single feature varies while the rest stay at their observed values.
          </p>
        </div>
      )}

      {/* Confusion Matrix */}
      {confusion && confusion.length === 2 && confusion[0].length === 2 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Confusion Matrix (test)</div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {confusion.flat().map((v, i) => (
              <div key={i} className="p-3 rounded border border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
                <div className="text-xs text-gray-500">{['TN','FP','FN','TP'][i]}</div>
                <div className="text-lg font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-snug">
            TN (true negatives) = correctly predicted non-defaults; FP (false positives) = predicted default but actually safe; FN (false negatives) = predicted safe but defaulted; TP (true positives) = correctly predicted defaults. Use the grid to spot where errors cluster.
          </p>
        </div>
      )}

      {/* Real Node-Link Tree (first estimator) */}
      {treeFull && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-900">Tree Overview</div>
          <GlobalTree tree={treeFull as any} maxDepth={6} />
          <div className="text-xs text-gray-500 mt-2">Showing first tree, depth limited for readability.</div>
        </div>
      )}

      {/* Random Forest Schematic (global) */}
      {selectedModel === 'rf' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Ensemble Overview</div>
          <RandomForestSchematic numTrees={ensembleTrace?.num_trees ?? 100} />
        </div>
      )}
    </div>
  );
}


