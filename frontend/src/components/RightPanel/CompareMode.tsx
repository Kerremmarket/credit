import { useStore } from '@/state/useStore';
import { useEffect } from 'react';
import Plot from 'react-plotly.js';

export function CompareMode() {
  const pinnedApplicants = useStore((state) => state.pinnedApplicants);
  const selectedModel = useStore((state) => state.selectedModel);
  const trainedModels = useStore((state) => state.trainedModels);
  const predictions = useStore((state) => state.predictions);
  const predictForApplicant = useStore((state) => state.predictForApplicant);

  useEffect(() => {
    // Get predictions for all pinned applicants
    if (trainedModels.has(selectedModel)) {
      pinnedApplicants.forEach((applicant) => {
        predictForApplicant(applicant);
      });
    }
  }, [pinnedApplicants, selectedModel, trainedModels]);

  if (!trainedModels.has(selectedModel)) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <p className="text-gray-600">Model not trained yet</p>
        </div>
      </div>
    );
  }

  // Get predictions for pinned applicants
  const comparisons = pinnedApplicants.map((applicant) => {
    const key = `${selectedModel}_${applicant.row_index}`;
    return {
      applicant,
      prediction: predictions[key],
    };
  });

  // Get common features for comparison
  const commonFeatures = pinnedApplicants[0]
    ? Object.keys(pinnedApplicants[0].feature_values).slice(0, 6)
    : [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Compare Mode - {pinnedApplicants.length} Applicants
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Side-by-side comparison of pinned applicants
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Predictions Comparison */}
        <div className="glass-card p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Prediction Comparison
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {comparisons.map(({ applicant, prediction }) => (
              <div
                key={applicant.row_index}
                className="text-center p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Applicant #{applicant.row_index}
                </div>
                {prediction !== undefined ? (
                  <>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {(prediction * 100).toFixed(1)}%
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${prediction > 0.7 ? 'bg-red-100 text-red-800' :
                        prediction > 0.3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'}`}
                    >
                      {prediction > 0.7 ? 'High Risk' :
                       prediction > 0.3 ? 'Medium Risk' : 'Low Risk'}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400">Loading...</div>
                )}
                
                {applicant.label !== undefined && (
                  <div className="mt-2 text-xs text-gray-600">
                    Actual: {applicant.label === 1 ? 'Defaulted' : 'No Default'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="glass-card p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Feature Values
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Feature
                  </th>
                  {pinnedApplicants.map((applicant) => (
                    <th
                      key={applicant.row_index}
                      className="text-center py-2 px-3 font-medium text-gray-700"
                    >
                      #{applicant.row_index}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commonFeatures.map((feature) => {
                  const values = pinnedApplicants.map(
                    (a) => a.feature_values[feature]
                  );
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min;
                  
                  return (
                    <tr key={feature} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-600">
                        {feature}
                      </td>
                      {pinnedApplicants.map((applicant) => {
                        const value = applicant.feature_values[feature];
                        const isMin = value === min && range > 0;
                        const isMax = value === max && range > 0;
                        
                        return (
                          <td
                            key={applicant.row_index}
                            className={`py-2 px-3 text-center font-mono ${
                              isMin ? 'text-green-600 font-semibold' :
                              isMax ? 'text-red-600 font-semibold' :
                              'text-gray-700'
                            }`}
                          >
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">Green</span> = Lowest value,
            <span className="text-red-600 font-semibold ml-2">Red</span> = Highest value
          </div>
        </div>

        {/* Risk Distribution Chart */}
        {comparisons.every(c => c.prediction !== undefined) && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Risk Distribution
            </h3>
            
            <Plot
              data={[
                {
                  x: comparisons.map(c => `#${c.applicant.row_index}`),
                  y: comparisons.map(c => c.prediction! * 100),
                  type: 'bar',
                  marker: {
                    color: comparisons.map(c => 
                      c.prediction! > 0.7 ? 'rgba(239, 68, 68, 0.8)' :
                      c.prediction! > 0.3 ? 'rgba(250, 204, 21, 0.8)' :
                      'rgba(34, 197, 94, 0.8)'
                    ),
                  },
                  text: comparisons.map(c => `${(c.prediction! * 100).toFixed(1)}%`),
                  textposition: 'outside',
                },
              ]}
              layout={{
                height: 300,
                margin: { t: 20, r: 20, b: 40, l: 40 },
            xaxis: { title: { text: 'Applicant' } },
                yaxis: { 
              title: { text: 'Default Probability (%)' },
                  range: [0, 100],
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              className="w-full"
            />
          </div>
        )}

        {/* Clear Comparison Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              pinnedApplicants.forEach((applicant) => {
                useStore.getState().togglePinApplicant(applicant);
              });
            }}
            className="btn-secondary"
          >
            Clear All Comparisons
          </button>
        </div>
      </div>
    </div>
  );
}
