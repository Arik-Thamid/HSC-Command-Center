"use client";

export interface TrendPoint {
  label: string;
  value: number;
}

export default function TrendChart({ points, title }: { points: TrendPoint[]; title: string }) {
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  if (points.length === 0) return null;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const step = Math.max(1, Math.ceil(points.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
      <title>{title}</title>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="#1c2c4d" strokeWidth={1} />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill="#7f8bab">
            {g}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(60)} y2={y(60)} stroke="#e6b450" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      <path d={path} fill="none" stroke="#5fd1a0" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="#5fd1a0" />
          {i % step === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#7f8bab">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
