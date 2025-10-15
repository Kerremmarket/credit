import { useStore } from '@/state/useStore';
import { ModelSelector } from './ModelSelector';
import { ModelVisualization } from './ModelVisualization';
import { ModelSummary } from './ModelSummary';
import { OutputBlock } from './OutputBlock';
import { CompareMode } from './CompareMode';

export function RightPanel() {
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
                    <div className="hidden group-hover:block absolute left-4 top-full mt-2 z-[9999] w-[28rem] max-h-[26rem] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg p-3 text-[11px] text-gray-700">
                      <div className="space-y-2 leading-snug">
                        <div>
                          <span className="font-semibold">Forward pass:</span>
                          <div><span className="font-mono">a^(0)</span> = preprocessed features <span className="font-mono">x′</span></div>
                          <div><span className="font-mono">z^(ℓ) = W^(ℓ)a^(ℓ−1) + b^(ℓ)</span>, <span className="font-mono">a^(ℓ) = ReLU(z^(ℓ))</span> for hidden layers</div>
                          <div><span className="font-mono">z^(L) = W^(L)a^(L−1) + b^(L)</span>, <span className="font-mono">p = σ(z^(L))</span> for output</div>
                        </div>
                        <div>
                          <span className="font-semibold">Cells (neurons):</span>
                          <div>Number = post‑activation <span className="font-mono">a_i^(ℓ)</span>. Green: active (<span className="font-mono">a_i^(ℓ)&gt;0</span>); Red: gated off (<span className="font-mono">a_i^(ℓ)=0</span>). Output shows <span className="font-mono">p∈(0,1)</span>.</div>
                        </div>
                        <div>
                          <span className="font-semibold">Strings (connections):</span>
                          <div>Thickness/opacity ∝ <span className="font-mono">|a_i^(ℓ)|</span> of the source neuron (more active ⇒ thicker/brighter).</div>
                        </div>
                        <div>
                          <span className="font-semibold">How cell values contribute:</span>
                          <div className="font-mono text-[10px]">z^(L) = b^(L) + Σ_i w^(L)_(1,i)·a_i^(L−1)</div>
                          <div>Contribution of last hidden neuron <span className="font-mono">i</span> to the logit: <span className="font-mono">c_i = w^(L)_(1,i)·a_i^(L−1)</span>.</div>
                          <div>Approximate effect on probability: <span className="font-mono">Δp_i ≈ p(1−p)·c_i</span> (since <span className="font-mono">σ′(z)=p(1−p)</span>).</div>
                          <div>Earlier layers influence via downstream weights and ReLU gates (chain rule with <span className="font-mono">D^(t)=diag(1[z^(t)&gt;0])</span>).</div>
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
