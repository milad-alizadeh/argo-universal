import { z } from 'zod';

// One measured window of an interaction: frame intervals from requestAnimationFrame, long tasks, and Chromium's own counters.
const summarySchema = z.object({
  durationMs: z.number(),
  fps: z.number(),
  p95Ms: z.number(),
  maxMs: z.number(),
  // Frame intervals over one 60 Hz frame (16.7 ms), plus 2 ms of timer jitter.
  droppedFrames: z.number(),
  longTasks: z.number(),
  layouts: z.number(),
  styleRecalcs: z.number(),
  layoutMs: z.number(),
  styleMs: z.number(),
  scriptMs: z.number(),
  // The compositor's view of each frame it drew: whole, with the page's main-thread update missing (scrolled without new content), or dropped.
  presentedFrames: z.number(),
  partialFrames: z.number(),
  compositorDropped: z.number(),
});
type Summary = z.infer<typeof summarySchema>;
// Every frame interval rides along for charts; medians leave it out.
export type Sample = Summary & { intervals?: number[] };

// The value at `index`, clamped to the list.
export const at = (sorted: readonly number[], index: number): number =>
  sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;

const middle = (values: number[]): number =>
  at(
    values.toSorted((a, b) => a - b),
    Math.floor(values.length / 2),
  );

// The median of each field over several runs.
export const median = (samples: readonly Sample[]): Sample =>
  summarySchema.parse(
    Object.fromEntries(
      Object.keys(summarySchema.shape).map((key) => [
        key,
        middle(samples.map((sample) => Number(Reflect.get(sample, key)))),
      ]),
    ),
  );
