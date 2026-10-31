import { describe, expect, it } from 'vitest';
import { noOutputFailure, outputRate } from './real-agent-output.mts';

describe('recording what a real Agent streamed while the Feed was scrolled', () => {
  it('reports the rows that arrived and how fast they came', () => {
    expect(
      outputRate({ revisionBefore: 644, revisionAfter: 744, durationMs: 4000 }),
    ).toEqual({ rows: 100, durationMs: 4000, rowsPerSecond: 25 });
  });

  it('reports a rate of zero for a window that recorded no time', () => {
    expect(
      outputRate({ revisionBefore: 644, revisionAfter: 644, durationMs: 0 }),
    ).toEqual({ rows: 0, durationMs: 0, rowsPerSecond: 0 });
  });

  it('reads a slow Agent as a condition of the run, not a failure', () => {
    const rate = outputRate({
      revisionBefore: 10,
      revisionAfter: 11,
      durationMs: 60_000,
    });

    expect(rate.rowsPerSecond).toBeCloseTo(0.016_67, 4);
    expect(noOutputFailure(rate)).toBeUndefined();
  });

  it('refuses a pass in which nothing streamed, which measured no live output', () => {
    expect(
      noOutputFailure(
        outputRate({
          revisionBefore: 644,
          revisionAfter: 644,
          durationMs: 9000,
        }),
      ),
    ).toMatch(/no Feed rows/u);
  });
});
