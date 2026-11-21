import { describe, expect, it } from 'vitest';
import { TurnGaps } from './turn-gaps';

const step = 50;

// Feeds one level pair per 50 ms, as the probe does; returns the time after the last one.
function feed(
  gaps: TurnGaps,
  from: number,
  { count, input, output }: { count: number; input: number; output: number },
): number {
  for (let index = 0; index < count; index += 1)
    gaps.sample(from + index * step, input, output);

  return from + count * step;
}

describe('TurnGaps', () => {
  it('times from the last sound of the person to the first of the voice', () => {
    const gaps = new TurnGaps();
    const spoke = feed(gaps, 0, { count: 20, input: 0.2, output: 0 });
    const waited = feed(gaps, spoke, { count: 12, input: 0, output: 0 });
    feed(gaps, waited, { count: 4, input: 0, output: 0.3 });

    // The person's last loud reading was one step before `spoke`.
    expect(gaps.gaps).toEqual([waited - (spoke - step)]);
  });

  it('measures nothing when the voice speaks first', () => {
    const gaps = new TurnGaps();
    feed(gaps, 0, { count: 10, input: 0, output: 0.3 });

    expect(gaps.gaps).toEqual([]);
  });

  it('takes a short noise for no turn', () => {
    const gaps = new TurnGaps();
    const clicked = feed(gaps, 0, { count: 2, input: 0.2, output: 0 });
    const waited = feed(gaps, clicked, { count: 10, input: 0, output: 0 });
    feed(gaps, waited, { count: 4, input: 0, output: 0.3 });

    expect(gaps.gaps).toEqual([]);
  });

  it('ignores the microphone while the voice speaks and through its breaths', () => {
    const gaps = new TurnGaps();
    const said = feed(gaps, 0, { count: 10, input: 0.2, output: 0.3 });
    const breath = feed(gaps, said, { count: 4, input: 0.2, output: 0 });
    feed(gaps, breath, { count: 10, input: 0.2, output: 0.3 });

    expect(gaps.gaps).toEqual([]);
  });

  it('times each turn of a call', () => {
    const gaps = new TurnGaps();
    let at = feed(gaps, 0, { count: 10, input: 0.2, output: 0 });
    at = feed(gaps, at, { count: 10, input: 0, output: 0 });
    at = feed(gaps, at, { count: 10, input: 0, output: 0.3 });
    at = feed(gaps, at, { count: 10, input: 0, output: 0 });
    at = feed(gaps, at, { count: 10, input: 0.2, output: 0 });
    at = feed(gaps, at, { count: 6, input: 0, output: 0 });
    feed(gaps, at, { count: 4, input: 0, output: 0.3 });

    expect(gaps.gaps).toEqual([550, 350]);
  });
});
