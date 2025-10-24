import { useMemo, useRef, useState } from 'react';
import { FEATURE_ABBREV } from '@/lib/featureAbbrev';
import { FullScreenModal } from './FullScreenModal';

type TreeStruct = {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  feature_names?: string[];
  feature_abbrev?: Record<string, string>;
};

interface GlobalTreeProps {
  tree: TreeStruct;
  maxDepth?: number; // optional depth limit for readability
}

export function GlobalTree({ tree, maxDepth = 6 }: GlobalTreeProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const { nodes, edges, width, height } = useMemo(() => {
    const left = tree.children_left || [];
    const right = tree.children_right || [];
    const feature = tree.feature || [];
    const threshold = tree.threshold || [];
    const featureNames = tree.feature_names || [];
    const featureAbbrev = tree.feature_abbrev || {};

    const n = feature.length;
    if (!n || left.length !== n || right.length !== n) {
      return { nodes: [], edges: [], width: 0, height: 0 };
    }

    // Compute positions using in-order traversal to spread leaves
    const posX: number[] = new Array(n).fill(0);
    const posY: number[] = new Array(n).fill(0);
    let cursorX = 0;
    const visited = new Set<number>();

    const layout = (idx: number, depth: number) => {
      if (idx < 0 || depth > maxDepth) return;
      visited.add(idx);
      const hasLeft = left[idx] !== -1;
      const hasRight = right[idx] !== -1;
      if (hasLeft) layout(left[idx], depth + 1);
      posX[idx] = cursorX++;
      posY[idx] = depth;
      if (hasRight) layout(right[idx], depth + 1);
    };

    layout(0, 0);

    // Normalize positions to pixels
    const xGap = 100; // horizontal spacing in px
    const yGap = 200; // vertical spacing in px
    const padding = 40;
    const pxNodes = [] as { id: number; x: number; y: number; isLeaf: boolean; label: string; thresh?: string }[];
    const pxEdges = [] as { x1: number; y1: number; x2: number; y2: number }[];

    const used = visited;

    const xs = [] as number[];
    const ys = [] as number[];
    used.forEach((i: number) => {
      xs.push(posX[i]);
      ys.push(posY[i]);
    });
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 0);
    const maxY = Math.max(...ys, 0);

    used.forEach((i: number) => {
      const isLeaf = left[i] === -1 && right[i] === -1;
      const fullName = feature[i] >= 0 ? (featureNames[feature[i]] || `f${feature[i]}`) : '';
      const name = feature[i] >= 0
        ? (FEATURE_ABBREV[fullName] || featureAbbrev[fullName] || fullName)
        : 'leaf';
      const tx = padding + (posX[i] - minX) * xGap;
      const ty = padding + posY[i] * yGap;
      pxNodes.push({ id: i, x: tx, y: ty, isLeaf, label: name, thresh: !isLeaf ? threshold[i].toFixed(3) : undefined });
    });

    pxNodes.forEach((node) => {
      const i = node.id;
      if (left[i] !== -1 && used.has(left[i])) {
        const child = pxNodes.find((n) => n.id === left[i]);
        if (child) pxEdges.push({ x1: node.x, y1: node.y, x2: child.x, y2: child.y });
      }
      if (right[i] !== -1 && used.has(right[i])) {
        const child = pxNodes.find((n) => n.id === right[i]);
        if (child) pxEdges.push({ x1: node.x, y1: node.y, x2: child.x, y2: child.y });
      }
    });

    const svgWidth = padding * 2 + (maxX - minX + 1) * xGap;
    const svgHeight = padding * 2 + (maxY + 1) * yGap;
    return { nodes: pxNodes, edges: pxEdges, width: svgWidth, height: svgHeight };
  }, [tree, maxDepth]);

  if (!nodes.length) {
    return <div className="text-sm text-gray-500">No tree available.</div>;
  }

  const onWheel = (e: React.WheelEvent) => {
    // Avoid preventDefault on passive listeners; just compute zoom
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(3, Math.max(0.1, s * factor)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };
  const onMouseUp = () => { dragging.current = false; };
  const onMouseLeave = () => { dragging.current = false; };

  return (
    <>
      <div className="space-y-2">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Drag to pan, scroll to zoom
          </div>
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => { setScale((s) => Math.max(0.1, s * 0.9)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              −
            </button>
            <button 
              type="button"
              onClick={() => { setScale((s) => Math.min(3, s * 1.1)); }}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              +
            </button>
            <button 
              type="button"
              onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
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

        {/* Tree View */}
        <div
          className="w-full overflow-hidden border border-gray-200 rounded overscroll-contain"
          style={{ maxHeight: 420, cursor: dragging.current ? 'grabbing' : 'grab' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
      <svg width={width} height={height}>
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#D1D5DB" strokeWidth={2 / scale} />
          ))}
          {nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x - 48}
                y={n.y - 18}
                width={96}
                height={36}
                rx={6}
                fill={n.isLeaf ? '#ECFDF5' : '#F3F4F6'}
                stroke={n.isLeaf ? '#A7F3D0' : '#E5E7EB'}
                strokeWidth={1 / scale}
              />
              <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={10 / scale} fill="#374151">
                {n.isLeaf ? 'Leaf' : n.label}
              </text>
              {!n.isLeaf && (
                <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize={10 / scale} fill="#6B7280">
                  ≤ {n.thresh}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
        </div>
      </div>

      {/* Full Screen Modal */}
      <FullScreenModal
        isOpen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        title="Random Forest - Decision Tree Structure"
      >
        <div className="w-full h-full flex items-center justify-center">
          <svg 
            width={width} 
            height={height}
            className="max-w-full max-h-full"
          >
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
              {edges.map((e, i) => (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#D1D5DB" strokeWidth={2 / scale} />
              ))}
              {nodes.map((n) => (
                <g key={n.id}>
                  <rect
                    x={n.x - 48}
                    y={n.y - 18}
                    width={96}
                    height={36}
                    rx={6}
                    fill={n.isLeaf ? '#ECFDF5' : '#F3F4F6'}
                    stroke={n.isLeaf ? '#A7F3D0' : '#E5E7EB'}
                    strokeWidth={1 / scale}
                  />
                  <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={10 / scale} fill="#374151">
                    {n.isLeaf ? 'Leaf' : n.label}
                  </text>
                  {!n.isLeaf && (
                    <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize={10 / scale} fill="#6B7280">
                      ≤ {n.thresh}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        </div>
      </FullScreenModal>
    </>
  );
}


