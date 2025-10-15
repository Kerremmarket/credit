import { useStore } from '@/state/useStore';
import { useEffect, useMemo, useState } from 'react';
import { abbrev } from '@/lib/featureAbbrev';
import Plot from 'react-plotly.js';

export function DistributionOverview() {
  const datasetMeta = useStore((state) => state.datasetMeta);
  const selectedFeatures = useStore((state) => state.selectedFeatures);
  
  const [selectedFeature, setSelectedFeature] = useState<string>('');

  // Always available; visuals only (no filtering)

  // Get features to display
  const displayFeatures = useMemo(() => {
    if (!datasetMeta) return [];
    // Visuals only: include only features with quantiles present to avoid crashes
    const features = (datasetMeta.feature_list || []).filter((f) => f !== 'SeriousDlqin2yrs');
    return features.filter((f) => datasetMeta.quantiles && (datasetMeta.quantiles as any)[f]);
  }, [datasetMeta]);

  // Initialize/repair selected feature from list changes
  useEffect(() => {
    if (displayFeatures.length === 0) return;
    if (!selectedFeature || !displayFeatures.includes(selectedFeature)) {
      setSelectedFeature(displayFeatures[0]);
    }
  }, [displayFeatures, selectedFeature]);

  // No filters

  // No training here anymore

  // No filter counts (visuals only)

  if (!datasetMeta) {
    return (
      <div className="p-4 text-center text-gray-500">
        No dataset loaded
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Distribution Overview
        </h3>
      </div>

      {/* Feature Selection */}
      <div className="mb-4">
        <select
          value={selectedFeature}
          onChange={(e) => setSelectedFeature(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {displayFeatures.map((feature) => (
            <option key={feature} value={feature}>
              {abbrev(feature)}
            </option>
          ))}
        </select>
      </div>

      {/* Histogram */}
      {selectedFeature && datasetMeta.quantiles[selectedFeature] && (
        <div className="mb-4">
          <Plot
            data={[
              {
                type: 'histogram' as const,
                x: Array(100).fill(0).map((_, i) => {
                  const stats = datasetMeta.quantiles[selectedFeature];
                  const range = stats.max - stats.min;
                  return stats.min + (range * i / 100);
                }),
                marker: {
                  color: 'rgba(59, 130, 246, 0.6)',
                  line: {
                    color: 'rgba(59, 130, 246, 1)',
                    width: 1
                  }
                },
                name: selectedFeature,
              }
            ]}
            layout={{
              title: {
                text: abbrev(selectedFeature),
                font: { size: 14 }
              },
              xaxis: { title: { text: 'Value' } },
              yaxis: { title: { text: 'Count' } },
              height: 300,
              margin: { t: 30, r: 20, b: 60, l: 50 },
              dragmode: false
            }}
            config={{
              displayModeBar: false,
              responsive: true
            }}
            className="w-full"
          />
          
      {/* No filtering UI */}
        </div>
      )}

      {/* Statistics */}
      {selectedFeature && datasetMeta.quantiles[selectedFeature] && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Statistics</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Mean:</span>
              <span className="font-medium">
                {datasetMeta.quantiles[selectedFeature].mean.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Std:</span>
              <span className="font-medium">
                {datasetMeta.quantiles[selectedFeature].std.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min:</span>
              <span className="font-medium">
                {datasetMeta.quantiles[selectedFeature].min.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max:</span>
              <span className="font-medium">
                {datasetMeta.quantiles[selectedFeature].max.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No active filters */}

      {/* Dataset Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Dataset</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <div>Total rows: {datasetMeta.row_count.toLocaleString()}</div>
          <div>Features: {(datasetMeta.feature_list || []).filter((f: string) => f !== 'SeriousDlqin2yrs').length}</div>
        </div>
      </div>

      {/* No training button here anymore */}
    </div>
  );
}
