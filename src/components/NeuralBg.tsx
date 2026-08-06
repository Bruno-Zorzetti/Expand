// Rede neural decorativa (nós + conexões) na cor do agente. Leve, sem imagem.
const NODES: [number, number][] = [
  [60, 80], [120, 50], [180, 90], [240, 60], [300, 100], [345, 60],
  [90, 150], [160, 170], [220, 140], [280, 180], [330, 150],
  [130, 240], [210, 230], [290, 245],
];
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [1, 7], [2, 8], [3, 9],
  [4, 10], [6, 7], [7, 8], [8, 9], [9, 10], [6, 11], [7, 12], [8, 12], [9, 13], [11, 12], [12, 13],
];

export default function NeuralBg({ cor, className = "" }: { cor: string; className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true">
      <g stroke={cor} strokeWidth="0.6" opacity="0.3">
        {EDGES.map(([a, b], i) => (
          <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
        ))}
      </g>
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.8} fill={cor} style={{ filter: `drop-shadow(0 0 4px ${cor})` }} opacity="0.85" />
      ))}
    </svg>
  );
}
