import { describe, expect, it } from 'vitest';
import { pollUntil, viewTimeoutMessage } from './view-timeout';

describe('view timeout', () => {
  it.each([
    { stallMs: 900, verdict: 'stalled for' },
    { stallMs: 3, verdict: 'stayed responsive' },
  ])('reads a $stallMs ms stall as "$verdict"', ({ stallMs, verdict }) => {
    const message = viewTimeoutMessage({
      what: 'x',
      limitMs: 3000,
      waitedMs: 3001,
      trees: 1,
      stallMs,
    });

    expect(message).toContain(verdict);
  });

  it('says when no view message ever arrived', () => {
    const message = viewTimeoutMessage({
      what: undefined,
      limitMs: 10,
      waitedMs: 11,
      stallMs: 1,
      trees: undefined,
    });

    expect(message).toContain('no view message');
  });

  it('still fails when the condition never holds', async () => {
    await expect(
      pollUntil(
        () => false,
        20,
        ({ waitedMs }) => `gave up after ${waitedMs >= 20}`,
      ),
    ).rejects.toThrow('gave up after true');
  });

  it('returns as soon as the condition holds', async () => {
    let polls = 0;

    await pollUntil(
      () => ++polls > 3,
      1000,
      () => 'unreachable',
    );
    expect(polls).toBe(4);
  });
});
