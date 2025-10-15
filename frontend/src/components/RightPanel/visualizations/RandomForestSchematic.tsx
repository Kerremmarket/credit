interface RandomForestSchematicProps {
  numTrees?: number;
}

// Simple SVG schematic of a Random Forest ensemble flow
export function RandomForestSchematic({ numTrees = 100 }: RandomForestSchematicProps) {
  const treeX = [120, 300, 480];
  const node = (cx: number, cy: number, fill: string) => (
    <circle cx={cx} cy={cy} r={12} fill={fill} stroke="#E5E7EB" strokeWidth={1} />
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" strokeWidth={2} markerEnd="url(#arrow)" />
    </g>
  );
  const label = (x: number, y: number, text: string) => (
    <text x={x} y={y} fontSize={10} fill="#374151" textAnchor="middle">{text}</text>
  );

  return (
    <div className="w-full overflow-auto">
      <svg viewBox="0 0 820 320" className="w-full h-80">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#111827" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#9CA3AF" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Dataset box */}
        <rect x={245} y={10} width={110} height={28} rx={4} fill="#111827" filter="url(#shadow)" />
        <text x={300} y={29} fontSize={12} fill="#FFFFFF" textAnchor="middle">DATASET</text>

        {/* Arrows to trees */}
        {treeX.map((x) => arrow(300, 38, x, 60))}

        {/* Three sample trees */}
        {treeX.map((x, idx) => (
          <g key={idx}>
            {/* root */}
            {node(x, 70, '#84CC16')}
            {/* level 1 */}
            {node(x - 40, 110, '#60A5FA')}
            {node(x + 40, 110, '#84CC16')}
            {/* leaves */}
            {node(x - 60, 150, '#60A5FA')}
            {node(x - 20, 150, '#60A5FA')}
            {node(x + 20, 150, '#60A5FA')}
            {node(x + 60, 150, '#60A5FA')}
            {/* connecting edges */}
            <line x1={x} y1={82} x2={x - 40} y2={98} stroke="#374151" strokeWidth={1} />
            <line x1={x} y1={82} x2={x + 40} y2={98} stroke="#374151" strokeWidth={1} />
            <line x1={x - 40} y1={122} x2={x - 60} y2={138} stroke="#374151" strokeWidth={1} />
            <line x1={x - 40} y1={122} x2={x - 20} y2={138} stroke="#374151" strokeWidth={1} />
            <line x1={x + 40} y1={122} x2={x + 20} y2={138} stroke="#374151" strokeWidth={1} />
            <line x1={x + 40} y1={122} x2={x + 60} y2={138} stroke="#374151" strokeWidth={1} />
            {label(x, 170, `Decision Tree ${idx + 1}`)}
            {/* Result label */}
            {arrow(x, 176, x, 200)}
            <text x={x} y={212} fontSize={10} fill="#374151" textAnchor="middle">Result {idx + 1}</text>
          </g>
        ))}

        {/* Ellipsis for many trees */}
        <text x={390} y={115} fontSize={16} fill="#6B7280">…</text>

        {/* Majority Voting / Averaging box */}
        <rect x={175} y={214} width={250} height={26} rx={4} fill="#F3F4F6" stroke="#E5E7EB" />
        <text x={300} y={231} fontSize={11} fill="#111827" textAnchor="middle">MAJORITY VOTING / AVERAGING ({numTrees} trees)</text>

        {/* Arrows from results to combiner */}
        {treeX.map((x) => arrow(x, 214, 300, 214))}

        {/* Final result */}
        {arrow(300, 240, 300, 255)}
        <rect x={256} y={255} width={88} height={24} rx={4} fill="#111827" />
        <text x={300} y={271} fontSize={11} fill="#FFFFFF" textAnchor="middle">FINAL RESULT</text>
      </svg>
    </div>
  );
}


