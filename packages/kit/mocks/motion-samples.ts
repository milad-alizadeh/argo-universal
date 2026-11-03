// Reads a motion sampled once a frame, such as a row's top while the content above it opens.
export interface Motion {
  // How often it turned back: a motion that goes one way only has none.
  reversals: number;
  // How far it went past where it came to rest.
  overshoot: number;
  // The largest move in one frame, as a share of the whole way.
  largestStepShare: number;
  // How far it travelled from the first sample to the last.
  travel: number;
}

const steps = (samples: readonly number[]): number[] =>
  samples.slice(1).map((sample, index) => sample - (samples[index] ?? sample));

function countReversals(moves: readonly number[]): number {
  const turns = moves.filter((move) => move !== 0).map(Math.sign);

  return turns.filter((turn, index) => index > 0 && turn !== turns[index - 1])
    .length;
}

function overshootOf(samples: readonly number[]): number {
  const first = samples[0] ?? 0;
  const last = samples.at(-1) ?? first;
  const furthest = last >= first ? Math.max(...samples) : Math.min(...samples);

  return Math.abs(furthest - last);
}

export function readMotion(samples: readonly number[]): Motion {
  const moves = steps(samples);
  const travel = Math.abs((samples.at(-1) ?? 0) - (samples[0] ?? 0));
  const largest = Math.max(0, ...moves.map(Math.abs));

  return {
    reversals: countReversals(moves),
    overshoot: overshootOf(samples),
    largestStepShare: travel ? largest / travel : 0,
    travel,
  };
}
