import { useStore } from '@/state/useStore';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export function OutputBlock() {
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const selectedModel = useStore((state) => state.selectedModel);
  const predictions = useStore((state) => state.predictions);
  const shapLocal = useStore((state) => state.shapLocal);
  const modelMetrics = useStore((state) => state.modelMetrics);

  const prediction = useMemo(() => {
    if (!selectedApplicant) return null;
    const key = `${selectedModel}_${selectedApplicant.row_index}`;
    return predictions[key];
  }, [predictions, selectedModel, selectedApplicant]);

  const topReasons = useMemo(() => {
    if (!shapLocal?.shap_values) return [];
    
    return Object.entries(shapLocal.shap_values)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([feature, value]) => ({
        feature,
        value,
        direction: value > 0 ? 'increases' : 'decreases',
      }));
  }, [shapLocal]);

  const metrics = modelMetrics[selectedModel];

  if (prediction === null || prediction === undefined) {
    return (
      <div className="text-center text-gray-500">
        No prediction available. Train the model first.
      </div>
    );
  }

  const riskLevel = prediction > 0.7 ? 'High' : prediction > 0.3 ? 'Medium' : 'Low';
  const riskColor = prediction > 0.7 ? 'red' : prediction > 0.3 ? 'yellow' : 'green';

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
      {/* Main Prediction */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Predicted Default Probability
        </h3>
        
        {/* Animated Meter */}
        <div className="relative w-full h-24 mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20,80 A 60,60 0 0,1 180,80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
              strokeLinecap="round"
            />
            
            {/* Colored segments */}
            <path
              d="M 20,80 A 60,60 0 0,1 73,40"
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 73,40 A 60,60 0 0,1 127,40"
              fill="none"
              stroke="rgb(250, 204, 21)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 127,40 A 60,60 0 0,1 180,80"
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            
            {/* Animated progress */}
            <motion.path
              d="M 20,80 A 60,60 0 0,1 180,80"
              fill="none"
              stroke={
                prediction > 0.7 ? 'rgb(239, 68, 68)' :
                prediction > 0.3 ? 'rgb(250, 204, 21)' :
                'rgb(34, 197, 94)'
              }
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: prediction }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            
            {/* Pointer */}
            <motion.line
              x1="100"
              y1="80"
              x2="100"
              y2="40"
              stroke="#1f2937"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ rotate: -90 }}
              animate={{ rotate: -90 + (prediction * 180) }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ transformOrigin: '100px 80px' }}
            />
            
            {/* Center dot */}
            <circle cx="100" cy="80" r="4" fill="#1f2937" />
            
            {/* Labels */}
            <text x="20" y="95" fontSize="10" fill="#9ca3af">0%</text>
            <text x="90" y="30" fontSize="10" fill="#9ca3af">50%</text>
            <text x="170" y="95" fontSize="10" fill="#9ca3af">100%</text>
          </svg>
        </div>

        {/* Numeric Display */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-bold text-gray-900 mb-2"
        >
          {(prediction * 100).toFixed(1)}%
        </motion.div>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
          ${riskColor === 'red' ? 'bg-red-100 text-red-800' :
            riskColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'}`}
        >
          {riskLevel} Risk
        </div>
      </div>

      {/* Key Reasons */}
      {topReasons.length > 0 && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Top Contributing Factors
          </h4>
          <div className="space-y-2">
            {topReasons.map((reason, index) => (
              <motion.div
                key={reason.feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center text-sm"
              >
                <span className={`mr-2 ${
                  reason.value > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {reason.value > 0 ? '↑' : '↓'}
                </span>
                <span className="flex-1 text-gray-700">
                  <span className="font-medium">{reason.feature}</span>
                  {' '}
                  <span className="text-gray-500">
                    {reason.direction} risk by {Math.abs(reason.value * 100).toFixed(1)}%
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Model Performance */}
      {metrics && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="text-gray-500 text-xs mb-1">Model AUC</div>
            <div className="font-semibold text-gray-900">
              {metrics.auc?.toFixed(3) || 'N/A'}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="text-gray-500 text-xs mb-1">Model Accuracy</div>
            <div className="font-semibold text-gray-900">
              {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Actual Label vs Prediction */}
      {selectedApplicant?.label !== undefined && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-900">Actual Outcome:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              selectedApplicant.label === 1
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {selectedApplicant.label === 1 ? 'Defaulted' : 'No Default'}
            </span>
          </div>
          {selectedApplicant.label === 1 && prediction < 0.5 && (
            <p className="text-xs text-blue-800 mt-2">
              ⚠️ Model predicted low risk but applicant defaulted
            </p>
          )}
          {selectedApplicant.label === 0 && prediction > 0.5 && (
            <p className="text-xs text-blue-800 mt-2">
              ⚠️ Model predicted high risk but applicant didn't default
            </p>
          )}
        </div>
      )}
    </div>
  );
}
