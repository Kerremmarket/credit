import { useEffect } from 'react';
import { useStore } from '@/state/useStore';
import Plot from 'react-plotly.js';
import { abbrev } from '@/lib/featureAbbrev';

export function ShapExplanation() {
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const selectedModel = useStore((state) => state.selectedModel);
  const trainedModels = useStore((state) => state.trainedModels);
  const shapSummary = useStore((state) => state.shapSummary);
  const resultFilters = useStore((state) => (state as any).resultFilters || {});
  const loadShapLocal = useStore((state) => state.loadShapLocal);
  const loadShapSummary = useStore((state) => state.loadShapSummary);

  useEffect(() => {
    if (!trainedModels.has(selectedModel)) return;
    // Local SHAP disabled globally; only load global importance
    if (!shapSummary) {
      loadShapSummary();
    }
  }, [selectedApplicant, selectedModel, trainedModels, JSON.stringify(resultFilters)]);

  if (!trainedModels.has(selectedModel)) {
    return <div className="text-center text-gray-500">Model not trained</div>;
  }

  if (selectedModel === 'rf') {
    return <div className="text-center text-gray-500">SHAP explanations are disabled for Random Forest.</div>;
  }

  // No local SHAP; we show only global importance

  // Global feature importance
  const globalImportance = shapSummary?.feature_importance
    ? Object.entries(shapSummary.feature_importance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      {/* Local SHAP removed intentionally */}

      {/* Global Feature Importance */}
      {globalImportance.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Global Feature Importance
          </h4>
          
          <div className="space-y-2">
            {globalImportance.map(([feature, importance]) => (
              <div key={feature} className="flex items-center">
                <span className="w-40 text-xs text-gray-600 truncate" title={feature}>
                  {abbrev(feature)}
                </span>
                <div className="flex-1 mx-2">
                  <div className="h-4 bg-gray-100 rounded relative">
                    <div
                      className="h-full bg-primary-500 rounded"
                      style={{
                        width: `${(importance / globalImportance[0][1]) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-12 text-xs text-right font-mono">
                  {importance.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation Help */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <h5 className="text-xs font-medium text-blue-900 mb-1">
          How to Read SHAP Values
        </h5>
        <ul className="text-xs text-blue-800 space-y-0.5">
          <li>• Positive values (green) increase default probability</li>
          <li>• Negative values (red) decrease default probability</li>
          <li>• Larger bars = stronger feature impact</li>
          <li>• Sum of all SHAP values + base = final prediction</li>
        </ul>
      </div>
    </div>
  );
}
