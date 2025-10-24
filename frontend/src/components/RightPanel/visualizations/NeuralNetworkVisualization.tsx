import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/state/useStore';
import { FullScreenModal } from './FullScreenModal';

export function NeuralNetworkVisualization() {
  const forwardTrace = useStore((state) => state.forwardTrace);
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const selectedModel = useStore((state) => state.selectedModel);
  const trainedModels = useStore((state) => state.trainedModels);
  const [arch, setArch] = useState<{ input_size: number; hidden_layers: number[]; output_size: number } | undefined>(undefined);
  const [scaleGlobal, setScaleGlobal] = useState<number>(1);
  const [offsetGlobal, setOffsetGlobal] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scaleApplicant, setScaleApplicant] = useState<number>(1);
  const [offsetApplicant, setOffsetApplicant] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    (async () => {
      if (!trainedModels.has(selectedModel) || selectedModel !== 'mlp') return;
      try {
        const { api } = await import('@/lib/api');
        const res = await api.getModelArchitecture('mlp');
        setArch({ input_size: res.input_size, hidden_layers: res.hidden_layers, output_size: res.output_size });
      } catch {
        setArch(undefined);
      }
    })();
  }, [selectedModel, trainedModels]);

  const isGlobal = !selectedApplicant;

  const networkData = useMemo(() => {
    // Build layers: feature layer + NN layers
    if (forwardTrace?.layers && !isGlobal) {
      // Applicant mode: add feature layer, then existing NN layers (limit hidden to 8)
      const featureLayer = { index: -1, neurons: arch?.input_size || forwardTrace.layers[0]?.a?.length || 1, activations: [], type: 'features' };
      const nnLayers = forwardTrace.layers.map((layer: any, idx: number) => ({
        index: idx,
        neurons: layer.a?.length || 1,
        activations: layer.a || [0],
        type: idx === forwardTrace.layers.length - 1 ? 'output' : 'hidden',
      }));
      return { layers: [featureLayer, ...nnLayers], proba: forwardTrace.proba, hasData: true };
    }
    // Global mode: feature layer + all NN layers (no limits)
    if (arch) {
      const layers: any[] = [];
      layers.push({ index: -1, neurons: arch.input_size, activations: new Array(arch.input_size).fill(0.5), type: 'features' });
      arch.hidden_layers.forEach((n, i) => {
        layers.push({ index: i, neurons: n, activations: new Array(n).fill(0.5), type: 'hidden' });
      });
      layers.push({ index: arch.hidden_layers.length, neurons: arch.output_size, activations: new Array(arch.output_size).fill(0.5), type: 'output' });
      return { layers, proba: undefined, hasData: false };
    }
    return null;
  }, [forwardTrace, arch, isGlobal, selectedApplicant]);

  if (!networkData) {
    return <div className="text-center text-gray-500">Loading neural network...</div>;
  }

  // Global: static image rendering; Applicant: interactive with pan/zoom
  if (isGlobal && arch) {
    // Static global visualization
    const allLayers = [
      { neurons: arch.input_size, type: 'features' },
      ...arch.hidden_layers.map((n) => ({ neurons: n, type: 'hidden' })),
      { neurons: arch.output_size, type: 'output' }
    ];
    const maxNeurons = Math.max(...allLayers.map((l) => l.neurons));
    const xSpacing = 60;
    const ySpacing = 12;
    const viewWidth = xSpacing * (allLayers.length + 1);
    const viewHeight = maxNeurons * ySpacing + 50;
    
    return (
      <>
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Network Architecture: {[arch.input_size, ...arch.hidden_layers, arch.output_size].join(' → ')}
            </h4>
            <div className="text-xs text-gray-500">Static overview (all neurons shown; scroll to zoom)</div>
          </div>
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => { setScaleGlobal((s) => Math.max(0.1, s * 0.9)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              −
            </button>
            <button 
              type="button"
              onClick={() => { setScaleGlobal((s) => Math.min(3, s * 1.1)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              +
            </button>
            <button 
              type="button"
              onClick={() => { setScaleGlobal(1); setOffsetGlobal({ x: 0, y: 0 }); }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Reset
            </button>
            <button 
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 ml-2"
              title="Full Screen View"
            >
              ⛶ Full Screen
            </button>
          </div>
        </div>
        <div 
          className="w-full overflow-auto"
          style={{ maxHeight: '400px', cursor: dragging.current ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => { 
            dragging.current = true; 
            lastPos.current = { x: e.clientX, y: e.clientY }; 
            e.preventDefault();
          }}
          onMouseMove={(e) => {
            if (!dragging.current) return;
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setOffsetGlobal((o) => ({ x: o.x + dx / scaleGlobal, y: o.y + dy / scaleGlobal }));
          }}
          onMouseUp={() => { dragging.current = false; }}
          onMouseLeave={() => { dragging.current = false; }}
        >
          <svg 
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            style={{ 
              width: '100%', 
              height: 'auto',
              maxWidth: '600px',
              transform: `scale(${scaleGlobal}) translate(${offsetGlobal.x}px, ${offsetGlobal.y}px)`,
              transformOrigin: 'top left'
            }}
          >
            {/* Connections */}
            {allLayers.slice(0, -1).map((layer, layerIdx) => {
              const nextLayer = allLayers[layerIdx + 1];
              const x1 = (layerIdx + 1) * xSpacing;
              const x2 = (layerIdx + 2) * xSpacing;
              const y1Offset = (maxNeurons - layer.neurons) * ySpacing / 2;
              const y2Offset = (maxNeurons - nextLayer.neurons) * ySpacing / 2;
              return new Array(layer.neurons).fill(0).map((_, i) => {
                const y1 = 25 + y1Offset + i * ySpacing;
                return new Array(nextLayer.neurons).fill(0).map((__, j) => {
                  const y2 = 25 + y2Offset + j * ySpacing;
                  return (
                    <line key={`${layerIdx}-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(59,130,246,0.2)" strokeWidth={0.5} />
                  );
                });
              }).flat();
            }).flat()}
            {/* Neurons */}
            {allLayers.map((layer, layerIdx) => {
              const x = (layerIdx + 1) * xSpacing;
              const yOffset = (maxNeurons - layer.neurons) * ySpacing / 2;
              return new Array(layer.neurons).fill(0).map((_, i) => {
                const y = 25 + yOffset + i * ySpacing;
                return (
                  <circle key={`${layerIdx}-${i}`} cx={x} cy={y} r="4" fill="rgb(34,197,94)" fillOpacity={0.6} stroke="rgb(34,197,94)" strokeWidth="1" />
                );
              });
            }).flat()}
            {/* Labels */}
            {allLayers.map((layer, idx) => (
              <text key={idx} x={(idx + 1) * xSpacing} y="15" fontSize="9" fill="#666" textAnchor="middle">
                {layer.type === 'features' ? 'Features' : layer.type === 'output' ? 'Output' : `Hidden ${idx}`}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Full Screen Modal for Global View */}
      <FullScreenModal
        isOpen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        title={`Neural Network Architecture: ${[arch.input_size, ...arch.hidden_layers, arch.output_size].join(' → ')}`}
      >
        <div className="w-full h-full flex items-center justify-center">
          <svg 
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            style={{ 
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
              {/* Connections */}
              {allLayers.slice(0, -1).map((layer, layerIdx) => {
                const nextLayer = allLayers[layerIdx + 1];
                const x1 = (layerIdx + 1) * xSpacing;
                const x2 = (layerIdx + 2) * xSpacing;
                const y1Offset = (maxNeurons - layer.neurons) * ySpacing / 2;
                const y2Offset = (maxNeurons - nextLayer.neurons) * ySpacing / 2;
                return new Array(layer.neurons).fill(0).map((_, i) => {
                  const y1 = 25 + y1Offset + i * ySpacing;
                  return new Array(nextLayer.neurons).fill(0).map((__, j) => {
                    const y2 = 25 + y2Offset + j * ySpacing;
                    return (
                      <line key={`${layerIdx}-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(59,130,246,0.2)" strokeWidth={0.5} />
                    );
                  });
                }).flat();
              }).flat()}
              {/* Neurons */}
              {allLayers.map((layer, layerIdx) => {
                const x = (layerIdx + 1) * xSpacing;
                const yOffset = (maxNeurons - layer.neurons) * ySpacing / 2;
                return new Array(layer.neurons).fill(0).map((_, i) => {
                  const y = 25 + yOffset + i * ySpacing;
                  return (
                    <circle key={`${layerIdx}-${i}`} cx={x} cy={y} r="4" fill="rgb(34,197,94)" fillOpacity={0.6} stroke="rgb(34,197,94)" strokeWidth="1" />
                  );
                });
              }).flat()}
              {/* Labels */}
              {allLayers.map((layer, idx) => (
                <text key={idx} x={(idx + 1) * xSpacing} y="15" fontSize="9" fill="#666" textAnchor="middle">
                  {layer.type === 'features' ? 'Features' : layer.type === 'output' ? 'Output' : `Hidden ${idx}`}
                </text>
              ))}
          </svg>
        </div>
      </FullScreenModal>
    </>
    );
  }

  // Applicant mode: interactive with weighted connections
  const numLayers = networkData.layers.length;
  const xSpacing = 140;
  const viewWidth = xSpacing * (numLayers + 1);
  // Find the max neurons across ALL layers to ensure all neurons are visible
  const maxNeuronsInLayer = Math.max(...networkData.layers.map((l: any) => l.neurons));
  const viewHeight = maxNeuronsInLayer * 35 + 100;
  const ySpacing = viewHeight / (maxNeuronsInLayer + 2);

  return (
    <>
    <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Network Architecture: {networkData.layers.map((l: any) => l.neurons).join(' → ')}
            </h4>
            <div className="text-xs text-gray-500">All neurons shown in applicant view</div>
          </div>
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => { setScaleApplicant((s) => Math.max(0.1, s * 0.9)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              −
            </button>
            <button 
              type="button"
              onClick={() => { setScaleApplicant((s) => Math.min(3, s * 1.1)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              +
            </button>
            <button 
              type="button"
              onClick={() => { setScaleApplicant(1); setOffsetApplicant({ x: 0, y: 0 }); }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Reset
            </button>
            <button 
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 ml-2"
              title="Full Screen View"
            >
              ⛶ Full Screen
            </button>
          </div>
        </div>
        <div
          className="overflow-auto overscroll-contain"
          onWheel={(e) => {
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;
            setScaleApplicant((s) => Math.min(3, Math.max(0.1, s * factor)));
          }}
          onMouseDown={(e) => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; }}
          onMouseMove={(e) => {
            if (!dragging.current) return;
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setOffsetApplicant((o) => ({ x: o.x + dx, y: o.y + dy }));
          }}
          onMouseUp={() => { dragging.current = false; }}
          onMouseLeave={() => { dragging.current = false; }}
          style={{ cursor: dragging.current ? 'grabbing' : 'grab', maxHeight: '600px', minHeight: '400px' }}
        >
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            style={{ 
              width: `${viewWidth * scaleApplicant}px`, 
              height: `${viewHeight * scaleApplicant}px`,
              minWidth: `${viewWidth}px`,
              transform: `translate(${offsetApplicant.x}px, ${offsetApplicant.y}px)` 
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Draw connections with weighted thickness */}
            {networkData.layers.slice(0, -1).map((layer: any, layerIdx: number) => {
              const nextLayer = networkData.layers[layerIdx + 1];
              const x1 = (layerIdx + 1) * xSpacing;
              const x2 = (layerIdx + 2) * xSpacing;
              const currentCount = layer.neurons;
              const nextCount = nextLayer.neurons;
              return new Array(currentCount).fill(0).map((_, neuronIdx: number) => {
                const y1 = (neuronIdx + 1) * ySpacing;
                return new Array(nextCount).fill(0).map((__, nextIdx: number) => {
                  const y2 = (nextIdx + 1) * ySpacing;
                  const activation = layer.activations?.[neuronIdx] ?? 0.5;
                  const weight = Math.abs(activation);
                  return (
                    <line
                      key={`${layerIdx}-${neuronIdx}-${nextIdx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgb(59, 130, 246)"
                      strokeWidth={Math.max(0.5, weight * 3)}
                      opacity={0.4 + weight * 0.4}
                    />
                  );
                });
              });
            }).flat()}

            {/* Draw neurons */}
            {networkData.layers.map((layer: any, layerIdx: number) => {
              const x = (layerIdx + 1) * xSpacing;
              const currentCount = layer.neurons;
              const isFeatureLayer = layer.type === 'features';
            return new Array(currentCount).fill(0).map((_, neuronIdx: number) => {
              const activation = layer.activations?.[neuronIdx] ?? 0.5;
              const y = (neuronIdx + 1) * ySpacing;
              return (
                <g key={`${layerIdx}-${neuronIdx}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill={activation > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                    fillOpacity={0.7}
                    stroke={activation > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                    strokeWidth="2"
                  />
                  {!isFeatureLayer && (
                    <text
                      x={x}
                      y={y + 3}
                      fontSize="8"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {Number(activation).toFixed(2)}
                    </text>
                  )}
                </g>
              );
            });
          }).flat()}

          {/* Layer labels */}
          {networkData.layers.map((layer: any, idx: number) => (
            <text
              key={`label-${idx}`}
              x={(idx + 1) * xSpacing}
              y="16"
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {layer.type === 'features' ? 'Features' :
               layer.type === 'output' ? 'Output' : 
               `Hidden ${idx}`}
            </text>
          ))}
          </svg>
        </div>
      </div>

      {/* Full Screen Modal for Applicant View */}
      <FullScreenModal
        isOpen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        title={`Neural Network - Applicant View: ${networkData.layers.map((l: any) => l.neurons).join(' → ')}`}
      >
        <div className="w-full h-full flex items-center justify-center">
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
              {/* Draw weighted connections */}
              {networkData.layers.slice(0, -1).map((layer: any, layerIdx: number) => {
                const nextLayer = networkData.layers[layerIdx + 1];
                const currentCount = layer.neurons;
                const nextCount = nextLayer.neurons;
                const weights = layer.w || [];
                return new Array(currentCount).fill(0).flatMap((_, neuronIdx: number) => {
                  return new Array(nextCount).fill(0).map((__, nextIdx: number) => {
                    const weight = weights[neuronIdx]?.[nextIdx] ?? 0.5;
                    const x1 = (layerIdx + 1) * xSpacing;
                    const x2 = (layerIdx + 2) * xSpacing;
                    const y1 = (neuronIdx + 1) * ySpacing;
                    const y2 = (nextIdx + 1) * ySpacing;
                    return (
                      <line
                        key={`${layerIdx}-${neuronIdx}-${nextIdx}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgb(59, 130, 246)"
                        strokeWidth={Math.max(0.5, weight * 3)}
                        opacity={0.4 + weight * 0.4}
                      />
                    );
                  });
                });
              }).flat()}

              {/* Draw neurons */}
              {networkData.layers.map((layer: any, layerIdx: number) => {
                const x = (layerIdx + 1) * xSpacing;
                const currentCount = layer.neurons;
                const isFeatureLayer = layer.type === 'features';
                return new Array(currentCount).fill(0).map((_, neuronIdx: number) => {
                  const activation = layer.activations?.[neuronIdx] ?? 0.5;
                  const y = (neuronIdx + 1) * ySpacing;
                  return (
                    <g key={`${layerIdx}-${neuronIdx}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill={activation > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                        fillOpacity={0.7}
                        stroke={activation > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                        strokeWidth="2"
                      />
                      {!isFeatureLayer && (
                        <text
                          x={x}
                          y={y + 3}
                          fontSize="8"
                          fill="white"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {Number(activation).toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                });
              }).flat()}

              {/* Layer labels */}
              {networkData.layers.map((layer: any, idx: number) => (
                <text
                  key={`label-${idx}`}
                  x={(idx + 1) * xSpacing}
                  y="16"
                  fontSize="10"
                  fill="#666"
                  textAnchor="middle"
                >
                  {layer.type === 'features' ? 'Features' :
                   layer.type === 'output' ? 'Output' : 
                   `Hidden ${idx}`}
                </text>
              ))}
            </svg>
        </div>
      </FullScreenModal>
    </>
  );
}
