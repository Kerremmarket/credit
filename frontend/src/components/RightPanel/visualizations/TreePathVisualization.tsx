import { useStore } from '@/state/useStore';
import { motion } from 'framer-motion';
import { FEATURE_ABBREV } from '@/lib/featureAbbrev';
import { TreeNode } from '@/types/api';

export function TreePathVisualization() {
  const treePath = useStore((state) => state.treePath);
  const selectedModel = useStore((state) => state.selectedModel);

  if (!treePath?.path) {
    return <div className="text-center text-gray-500">Loading tree path...</div>;
  }

  const modelName = selectedModel === 'rf' ? 'Random Forest' : 'XGBoost';

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {modelName} Decision Path
        </h4>
        <p className="text-xs text-gray-600">
          Following the path through the first tree in the ensemble
        </p>
      </div>

      {/* Decision Path */}
      <div className="space-y-2">
        {treePath.path.map((node: TreeNode, index: number) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative ${index > 0 ? 'ml-4' : ''}`}
          >
            {/* Connection line */}
            {index > 0 && (
              <div className="absolute left-0 top-0 -ml-4 w-4 h-full">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-300" />
                <div className="absolute left-3 top-4 w-3 h-0.5 bg-gray-300" />
              </div>
            )}

            {/* Node card */}
            <div
              className={`p-3 rounded-lg border-2 ${
                node.is_leaf
                  ? 'bg-primary-50 border-primary-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              {node.is_leaf ? (
                // Leaf node
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-700">
                    🍃 Leaf Node
                  </span>
                  <span className="text-lg font-bold text-primary-900">
                    {((node.leaf_value || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              ) : (
                // Decision node
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500">Feature:</span>
                      <div className="font-medium text-sm text-gray-900">
                        {(FEATURE_ABBREV as any)[node.feature as string] || node.feature}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        node.direction === 'left'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {node.direction === 'left' ? '← Left' : 'Right →'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div>
                      <span className="text-gray-500">Value: </span>
                      <span className="font-mono font-medium">
                        {node.sample_value?.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Threshold: </span>
                      <span className="font-mono font-medium">
                        {node.threshold?.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span
                      className={`font-medium ${
                        node.direction === 'left' ? 'text-blue-600' : 'text-orange-600'
                      }`}
                    >
                      {node.sample_value! <= node.threshold!
                        ? `✓ ${node.sample_value?.toFixed(3)} ≤ ${node.threshold?.toFixed(3)}`
                        : `✓ ${node.sample_value?.toFixed(3)} > ${node.threshold?.toFixed(3)}`}
                    </span>
                  </div>

                  {node.impurity !== undefined && (
                    <div className="text-xs text-gray-500">
                      Impurity: {node.impurity.toFixed(3)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Final Prediction */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: treePath.path.length * 0.1 }}
        className="bg-primary-50 p-4 rounded-lg border-2 border-primary-300"
      >
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-primary-900">
            Tree Prediction:
          </span>
          <span className="text-2xl font-bold text-primary-900">
            {(treePath.prediction * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-primary-700 mt-1">
          This is from one tree. The ensemble averages many trees.
        </p>
      </motion.div>
    </div>
  );
}
