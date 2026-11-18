import { milestones, type Lane } from './pace-milestones';

export const days = 7;

const hours = 24;

const minutes = 60;

const millis = 60_000;

export const dayMs = hours * minutes * millis;

const dateLength = 10;

export const dateOf = (stamp: number): string =>
  new Date(stamp).toISOString().slice(0, dateLength);

export const weekStart = (now: number): number =>
  Math.floor(now / dayMs) * dayMs - (days - 1) * dayMs;

export type Merge = {
  number: number;
  title: string;
  author: string | null;
  merged: number;
  opened: number;
};

export const bucketNames = [
  'Under 30 min',
  '30 min–2 hr',
  '2–6 hr',
  '6–24 hr',
  '24 hr or more',
];

const halfHour = 30;

const twoHours = 120;

const sixHours = 360;

const limits = [halfHour, twoHours, sixHours, hours * minutes, Infinity];

const medianFraction = 0.5;

const tailFraction = 0.9;

export function elapsed(start: number, end: number): number {
  return (end - start) / millis;
}

export function duration(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.round(value);

  if (rounded < minutes) return `${rounded} min`;

  return `${Math.floor(rounded / minutes)}h ${rounded % minutes}m`;
}

export const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

function median(values: number[]): number | null {
  const middle = (values.length - 1) * medianFraction;

  return mean(values.slice(Math.floor(middle), Math.ceil(middle) + 1));
}

function running(merges: Merge[], start: number): { x: number; y: number }[] {
  return Array.from({ length: days }, (_, index) => ({
    x: index + 1,
    y: merges.filter(({ merged }) => merged < start + (index + 1) * dayMs)
      .length,
  }));
}

function histogram(values: number[]): number[] {
  return limits.map(
    (limit, i) =>
      values.filter((value) => value >= (limits[i - 1] ?? 0) && value < limit)
        .length,
  );
}

// The two weeks use the same UTC day boundaries and count only merges into the default branch.
export type Week = {
  total: number;
  own: number;
  recent: Merge[];
  lanes: Lane[];
  points: ReturnType<typeof running>;
  bins: number[];
  average: number | null;
  median: number | null;
  p90: number | null;
};

function inWeek(all: Merge[], start: number): Merge[] {
  return all
    .filter(({ merged }) => merged >= start && merged < start + days * dayMs)
    .sort((a, b) => b.merged - a.merged);
}

const recentLimit = 2;

function durations(merges: Merge[]): number[] {
  return merges
    .map(({ opened, merged }) => elapsed(opened, merged))
    .sort((a, b) => a - b);
}

export function summarize(all: Merge[], start: number, viewer: string): Week {
  const merges = inWeek(all, start);

  const times = durations(merges);

  return {
    total: merges.length,
    own: merges.filter((pr) => pr.author === viewer).length,
    recent: merges.slice(0, recentLimit),
    lanes: milestones(merges),
    points: running(merges, start),
    bins: histogram(times),
    average: mean(times),
    median: median(times),
    p90: times[Math.ceil(times.length * tailFraction) - 1] ?? null,
  };
}
