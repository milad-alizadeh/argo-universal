import { Canvas } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Pace } from './pace-data';
import type { Week } from './pace-metrics';

const width = 660;

const height = 156;

const inset = 7;

const baseline = height - inset;

const radius = 3.5;

const gridOpacity = 0.22;

const areaOpacity = 0.1;

type Point = { x: number; y: number };

type Tone = 'muted' | 'info';

function coordinates(week: Week, ceiling: number): Point[] {
  const step = (width - inset - inset) / (week.points.length - 1);

  return week.points.map(({ y }, i) => ({
    x: inset + i * step,
    y: baseline - (y * (baseline - inset)) / ceiling,
  }));
}

function path(points: Point[]): string {
  return points
    .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

type Dot = { key: string; cx: number; cy: number; tone: Tone };

type Segment = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone: Tone;
  strokeWidth?: number;
};

type Series = { dots: Dot[]; lines: Segment[] };

function link(p: Point, next: Point, tone: Tone): Segment {
  return {
    key: `line-${tone}-${p.x}`,
    tone,
    strokeWidth: 3,
    x1: p.x,
    y1: p.y,
    x2: next.x,
    y2: next.y,
  };
}

function series(points: Point[], tone: Tone): Series {
  const dots = points.map(({ x, y }) => ({
    key: `dot-${tone}-${x}`,
    cx: x,
    cy: y,
    tone,
  }));

  const lines = points.flatMap((p, i) => {
    const next = points[i + 1];

    return next ? [link(p, next, tone)] : [];
  });

  return { dots, lines };
}

const grid = [inset, height / 2, baseline].map((y) => ({
  key: `grid-${y}`,
  x1: 0,
  x2: width,
  y1: y,
  y2: y,
  tone: 'muted' as const,
  stroke: true,
  intensity: gridOpacity,
}));

function scene(data: Pace): Series & { area: string } {
  const ceiling = Math.max(1, data.current.total, data.previous.total);
  const points = coordinates(data.current, ceiling);
  const current = series(points, 'info');
  const previous = series(coordinates(data.previous, ceiling), 'muted');
  const d = `${path(points)} L${width - inset} ${baseline} L${inset} ${baseline} Z`;

  return {
    area: d,
    dots: [...previous.dots, ...current.dots],
    lines: [...grid, ...previous.lines, ...current.lines],
  };
}

const totals = (week: Week): string => week.points.map((p) => p.y).join(', ');

const shade = { tone: 'info' as const, fill: true, intensity: areaOpacity };

type Scene = ReturnType<typeof scene>;

function drawing({ area, lines, dots }: Scene, label: string): JSX.Element {
  return (
    <Canvas width={width} height={height} camera="fixed" label={label}>
      <Canvas.Path key="area" d={area} {...shade} />
      {lines.map(({ key, ...line }) => (
        <Canvas.Line key={key} {...line} stroke />
      ))}
      {dots.map(({ key, ...dot }) => (
        <Canvas.Circle key={key} {...dot} r={radius} fill />
      ))}
    </Canvas>
  );
}

export function Plot({ data }: { data: Pace }): JSX.Element {
  const label = `Daily cumulative merges. Selected week: ${totals(data.current)}. Previous week: ${totals(data.previous)}.`;

  return drawing(scene(data), label);
}
