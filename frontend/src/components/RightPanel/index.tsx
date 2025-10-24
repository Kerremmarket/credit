import { useStore } from '@/state/useStore';
import { ModelSelector } from './ModelSelector';
import { ModelVisualization } from './ModelVisualization';
import { ModelSummary } from './ModelSummary';
import { OutputBlock } from './OutputBlock';
import { CompareMode } from './CompareMode';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function RightPanel() {
  const renderMath = (latex: string, displayMode = false) => {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(latex, { throwOnError: false, displayMode }),
        }}
      />
    );
  };
  const pinnedApplicants = useStore((state) => state.pinnedApplicants);
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const selectedModel = useStore((state) => state.selectedModel);

  // Show compare mode if 2+ applicants are pinned
  if (pinnedApplicants.length >= 2) {
    return <CompareMode />;
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#f9fafb' }}>
      {/* Model Selector */}
      <div className="bg-white border-b border-gray-200 p-4">
        <ModelSelector />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {selectedApplicant ? (
          <div className="space-y-4">
            {/* Model Visualization */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Model Forward Pass
                {selectedModel === 'mlp' && (
                  <span className="relative group inline-flex items-center">
                    <span className="cursor-help text-gray-500 select-none">?</span>
                    <div className="hidden group-hover:block absolute left-4 top-full mt-2 z-[9999] w-[36rem] max-h-[30rem] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg p-4 text-xs text-gray-700">
                      <div className="space-y-3 leading-snug">
                        <div>
                          <span className="font-semibold block mb-2 text-sm">Forward pass:</span>
                          <div className="ml-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              {renderMath('a^{(0)} = x^{\\prime}')}
                              <span className="text-gray-600 text-[11px]">= preprocessed features</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div>{renderMath('z^{(\\ell)} = W^{(\\ell)} a^{(\\ell-1)} + b^{(\\ell)}, \\quad a^{(\\ell)} = \\text{ReLU}(z^{(\\ell)})')}</div>
                              <span className="text-gray-600 text-[11px] whitespace-nowrap">for hidden layers</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div>{renderMath('z^{(L)} = W^{(L)} a^{(L-1)} + b^{(L)}, \\quad p = \\sigma(z^{(L)})')}</div>
                              <span className="text-gray-600 text-[11px] whitespace-nowrap">for output</span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <span className="font-semibold block mb-2 text-sm">Cells (neurons):</span>
                          <div className="ml-2 text-[11px]">
                            Number = post-activation {renderMath('a_i^{(\\ell)}')}. Green: active ({renderMath('a_i^{(\\ell)} > 0')}); Red: gated off ({renderMath('a_i^{(\\ell)} = 0')}). Output shows {renderMath('p \\in (0,1)')}.
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <span className="font-semibold block mb-2 text-sm">Strings (connections):</span>
                          <div className="ml-2 text-[11px]">
                            Thickness/opacity {renderMath('\\propto |a_i^{(\\ell)}|')} of the source neuron (more active {renderMath('\\Rightarrow')} thicker/brighter).
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <span className="font-semibold block mb-2 text-sm">How cell values contribute:</span>
                          <div className="ml-2 space-y-1.5 text-[11px]">
                            <div>{renderMath('z^{(L)} = b^{(L)} + \\sum_i w^{(L)}_{1,i} \\cdot a_i^{(L-1)}')}</div>
                            <div>Contribution of last hidden neuron {renderMath('i')} to the logit: {renderMath('c_i = w^{(L)}_{1,i} \\cdot a_i^{(L-1)}')}</div>
                            <div>Approximate effect on probability: {renderMath('\\Delta p_i \\approx p(1-p) \\cdot c_i')} (since {renderMath('\\sigma^{\\prime}(z) = p(1-p)')}).</div>
                            <div>Earlier layers influence via downstream weights and ReLU gates (chain rule with {renderMath('D^{(t)} = \\text{diag}(\\mathbf{1}[z^{(t)} > 0])')}).</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </span>
                )}
              </h3>
              <ModelVisualization />
            </div>

            {/* Feature Explanations removed for applicant view */}

            {/* Output Block */}
            <div className="glass-card p-6">
              <OutputBlock />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Model Summary
                <span className="relative group inline-flex items-center">
                  <span className="cursor-help text-gray-500 select-none">?</span>
                  <div className="hidden group-hover:block absolute left-4 top-full mt-2 z-[9999] w-[22rem] max-h-[18rem] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg p-3 text-[11px] text-gray-700">
                    <div className="space-y-1">
                      <div><span className="font-semibold">AUC:</span> Measures how well the model ranks positives above negatives across all thresholds; 0.5 = random, 1.0 = perfect.</div>
                      <div><span className="font-semibold">Accuracy:</span> Share of correct predictions at a chosen threshold; can mislead on imbalanced data.</div>
                      <div><span className="font-semibold">Avg. pred. prob:</span> Average predicted probability on the set; should roughly align with base rate if calibrated.</div>
                      <div><span className="font-semibold">Feature importance:</span> Relative contribution of each feature to predictions; highlights key drivers.</div>
                    </div>
                  </div>
                </span>
              </h3>
              <ModelSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
