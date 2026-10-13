import type { CDPSession, Page } from '@playwright/test';
import type { Frames } from './browser.mts';
import { at, type Sample } from './sample.mts';
import {
  frameCategories,
  frameStates,
  type TraceEvent,
  trace,
} from './trace.mts';

const frameBudget = 1000 / 60;

const noFrames = { intervals: [], longTasks: 0 };

const jitter = 2;

type Metrics = Record<string, number>;

async function metrics(session: CDPSession): Promise<Metrics> {
  const { metrics: values } = await session.send('Performance.getMetrics');

  return Object.fromEntries(
    values.map((metric) => [metric.name, metric.value]),
  );
}

const change = (before: Metrics, after: Metrics, name: string): number =>
  (after[name] ?? 0) - (before[name] ?? 0);

const count = (states: Record<string, number>, state: string): number =>
  states[state] ?? 0;

type FrameSummary = Pick<
  Sample,
  'durationMs' | 'fps' | 'p95Ms' | 'maxMs' | 'droppedFrames' | 'longTasks'
> & { intervals: number[] };

function frameSummary({ intervals, longTasks }: Frames): FrameSummary {
  const sorted = intervals.toSorted((a, b) => a - b);
  const durationMs = intervals.reduce((sum, value) => sum + value, 0);

  return {
    durationMs,
    fps: (intervals.length * 1000) / Math.max(1, durationMs),
    p95Ms: at(sorted, Math.floor(sorted.length * 0.95)),
    maxMs: at(sorted, sorted.length - 1),
    droppedFrames: intervals.filter((value) => value > frameBudget + jitter)
      .length,
    longTasks,
    intervals,
  };
}

type Counters = Pick<
  Sample,
  'layouts' | 'styleRecalcs' | 'layoutMs' | 'styleMs' | 'scriptMs'
>;

// Chromium's layout, style and script counters over the window.
const counters = (before: Metrics, after: Metrics): Counters => ({
  layouts: change(before, after, 'LayoutCount'),
  styleRecalcs: change(before, after, 'RecalcStyleCount'),
  layoutMs: change(before, after, 'LayoutDuration') * 1000,
  styleMs: change(before, after, 'RecalcStyleDuration') * 1000,
  scriptMs: change(before, after, 'ScriptDuration') * 1000,
});

const compositor = (
  states: Record<string, number>,
): Pick<Sample, 'presentedFrames' | 'partialFrames' | 'compositorDropped'> => ({
  presentedFrames: count(states, 'STATE_PRESENTED_ALL'),
  partialFrames: count(states, 'STATE_PRESENTED_PARTIAL'),
  compositorDropped: count(states, 'STATE_DROPPED'),
});

type Action = () => Promise<void>;

// Samples every frame while `action` runs, under a light trace of the compositor's frames.
async function tracedFrames(
  page: Page,
  session: CDPSession,
  action: Action,
): Promise<{ frames: Frames; events: TraceEvent[] }> {
  const frames: Frames[] = [];

  const run = async (): Promise<void> => {
    await page.evaluate(() => window.perf.startFrames());
    await action();
    frames.push(await page.evaluate(() => window.perf.stopFrames()));
  };

  const { events } = await trace(session, run, frameCategories);

  return { frames: frames[0] ?? noFrames, events };
}

// Runs `action` while sampling every frame, and summarises the window.
export async function measure(
  page: Page,
  session: CDPSession,
  action: Action,
): Promise<Sample> {
  const before = await metrics(session);
  const { frames, events } = await tracedFrames(page, session, action);

  return {
    ...frameSummary(frames),
    ...counters(before, await metrics(session)),
    ...compositor(frameStates(events)),
  };
}
