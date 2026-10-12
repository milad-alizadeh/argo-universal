import type { CDPSession } from '@playwright/test';
import { z } from 'zod';

const eventSchema = z.looseObject({
  name: z.string(),
  ph: z.string(),
  dur: z.number().default(0),
});
export type TraceEvent = z.infer<typeof eventSchema>;
const traceSchema = z.union([
  z.array(eventSchema),
  z
    .looseObject({ traceEvents: z.array(eventSchema) })
    .transform((value) => value.traceEvents),
]);
// The compositor's report on one frame it drew.
const reportSchema = z.looseObject({
  name: z.literal('PipelineReporter'),
  ph: z.literal('b'),
  args: z.looseObject({
    frame_reporter: z.looseObject({ state: z.string() }),
  }),
});

// Only the compositor's frame reports: cheap enough to record on every run.
export const frameCategories = 'disabled-by-default-devtools.timeline.frame';
const fullCategories =
  'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,v8.execute';

const phases = new Set([
  'FunctionCall',
  'EvaluateScript',
  'RunMicrotasks',
  'UpdateLayoutTree',
  'Layout',
  'PrePaint',
  'Paint',
  'Layerize',
  'Commit',
  'RasterTask',
  'GPUTask',
  'HitTest',
  'ScrollLayer',
]);

// Adds `amount` to `key`'s running total.
const tally = (
  totals: Record<string, number>,
  key: string,
  amount: number,
): Record<string, number> => ({
  ...totals,
  [key]: (totals[key] ?? 0) + amount,
});

const reportedState = (event: TraceEvent): string[] => {
  const report = reportSchema.safeParse(event);
  return report.success ? [report.data.args.frame_reporter.state] : [];
};

// How many frames the compositor reported in each state.
export const frameStates = (
  events: readonly TraceEvent[],
): Record<string, number> =>
  events
    .flatMap(reportedState)
    .reduce<Record<string, number>>(
      (states, state) => tally(states, state, 1),
      {},
    );

async function readStream(
  session: CDPSession,
  handle: string,
): Promise<string> {
  let raw = '';
  let done = false;
  while (!done) {
    const chunk = await session.send('IO.read', { handle });
    raw += chunk.data;
    done = chunk.eof;
  }
  await session.send('IO.close', { handle });
  return raw;
}

async function stopTracing(session: CDPSession): Promise<string> {
  const complete = new Promise<{ stream?: string }>((resolve) =>
    session.once('Tracing.tracingComplete', resolve),
  );
  await session.send('Tracing.end');
  const { stream } = await complete;
  if (!stream) throw new Error('The trace has no stream');
  return readStream(session, stream);
}

// Records a Chromium trace while `action` runs, and returns its events.
export async function trace(
  session: CDPSession,
  action: () => Promise<void>,
  categories = fullCategories,
): Promise<{ raw: string; events: TraceEvent[] }> {
  await session.send('Tracing.start', {
    categories,
    transferMode: 'ReturnAsStream',
  });
  await action();
  const raw = await stopTracing(session);
  return { raw, events: traceSchema.parse(JSON.parse(raw)) };
}

// Total milliseconds per main-thread phase, the largest first.
export const hotspots = (
  events: readonly TraceEvent[],
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(
      events
        .filter((event) => event.ph === 'X' && phases.has(event.name))
        .reduce<Record<string, number>>(
          (totals, event) => tally(totals, event.name, event.dur / 1000),
          {},
        ),
    )
      .toSorted(([, a], [, b]) => b - a)
      .map(([name, ms]) => [name, Math.round(ms * 10) / 10]),
  );
