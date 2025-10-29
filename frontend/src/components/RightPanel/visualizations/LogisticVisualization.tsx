import { useStore } from '@/state/useStore';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { abbrev } from '@/lib/featureAbbrev';

export function LogisticVisualization() {
  const forwardTrace = useStore((state) => state.forwardTrace);
  // const selectedFeatures = useStore((state) => state.selectedFeatures);

  const renderMath = (latex: string) => {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(latex, { throwOnError: false }),
        }}
      />
    );
  };

  const visualData = useMemo(() => {
    if (!forwardTrace?.layers?.[0]) return null;

    const layer = forwardTrace.layers[0];
    const contributions = layer.feature_contributions || {};
    
    // Sort by absolute contribution
    const sortedFeatures = Object.entries(contributions)
      .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
      .slice(0, 10); // Show top 10

    return {
      features: sortedFeatures,
      intercept: layer.b?.[0] || 0,
      logit: forwardTrace.logit,
      proba: forwardTrace.proba,
    };
  }, [forwardTrace]);

  if (!visualData) {
    return <div className="text-center text-gray-500">Loading visualization...</div>;
  }

  return (
    <div className="p-4 rounded-lg overflow-x-auto" style={{ backgroundColor: '#f9fafb' }}>
      {/* Mathematical Formula */}
      <div className="p-4 rounded-lg overflow-x-auto" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          {renderMath('z = \\beta_0 + \\sum_{i=1}^{n} \\beta_i \\cdot x_i')}
        </div>
        <div className="text-center mt-2">
          {renderMath('P(y=1) = \\sigma(z) = \\frac{1}{1 + e^{-z}}')}
        </div>
      </div>

      {/* Feature Contributions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Feature Contributions to Logit
        </h4>
        <div className="space-y-2">
          {/* Intercept */}
          <div className="flex items-center">
            <span className="w-32 text-xs text-gray-600 truncate">Intercept</span>
            <div className="flex-1 mx-2">
              <div className="h-6 bg-gray-100 rounded relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.abs(visualData.intercept) * 20}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded ${
                    visualData.intercept >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
            <span className="w-16 text-xs text-right font-mono">
              {visualData.intercept.toFixed(3)}
            </span>
          </div>

          {/* Features */}
          {visualData.features.map(([feature, contribution], index) => {
            const val = contribution as number;
            return (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center"
              >
                <span className="w-32 text-xs text-gray-600 truncate" title={feature}>
                  {abbrev(feature)}
                </span>
                <div className="flex-1 mx-2">
                  <div className="h-6 bg-gray-100 rounded relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(Math.abs(val) * 50, 100)}%`,
                      }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={`h-full rounded ${
                        val >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
                <span className="w-16 text-xs text-right font-mono">
                  {val.toFixed(3)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Logit to Probability */}
      <div className="bg-primary-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-primary-900 mb-3">
          Transformation
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-primary-700">Sum (Logit z):</span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="font-mono font-bold text-primary-900"
            >
              {visualData.logit.toFixed(3)}
            </motion.span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-primary-700">Sigmoid σ(z):</span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 }}
              className="font-mono font-bold text-primary-900"
            >
              {(visualData.proba * 100).toFixed(1)}%
            </motion.span>
          </div>
        </div>

        {/* Sigmoid Curve Visualization */}
        <div className="mt-4">
          <svg viewBox="0 0 200 100" className="w-full h-24">
            {/* Sigmoid curve */}
            <path
              d="M 10,90 Q 50,90 100,50 T 190,10"
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
            />
            
            {/* Axes */}
            <line x1="10" y1="90" x2="190" y2="90" stroke="#ccc" strokeWidth="1" />
            <line x1="100" y1="10" x2="100" y2="90" stroke="#ccc" strokeWidth="1" />
            
            {/* Point on curve */}
            <motion.circle
              initial={{ cx: 100, cy: 50 }}
              animate={{
                cx: 100 + visualData.logit * 10,
                cy: 90 - visualData.proba * 80,
              }}
              transition={{ duration: 0.8, delay: 0.5 }}
              r="4"
              fill="rgb(239, 68, 68)"
            />
            
            {/* Labels */}
            <text x="95" y="8" fontSize="8" fill="#666">1</text>
            <text x="95" y="98" fontSize="8" fill="#666">0</text>
            <text x="185" y="98" fontSize="8" fill="#666">z</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
