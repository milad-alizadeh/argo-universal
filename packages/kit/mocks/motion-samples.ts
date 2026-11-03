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
  const turns = moves.flatMap((move) => (move === 0 ? [] : [Math.sign(move)]));

  return turns.filter((turn, index) => index > 0 && turn !== turns[index - 1])
    .length;
}

// The sample furthest along the way the motion went.
const furthest = (samples: readonly number[], rising: boolean): number =>
  rising ? Math.max(...samples) : Math.min(...samples);

function overshootOf(samples: readonly number[], last: number): number {
  const rising = last >= (samples[0] ?? last);

  return Math.abs(furthest(samples, rising) - last);
}

// The largest move in one frame as a share of the whole way; a motion that went nowhere has none.
function largestShare(moves: readonly number[], travel: number): number {
  const largest = Math.max(0, ...moves.map(Math.abs));

  return travel === 0 ? 0 : largest / travel;
}

export function readMotion(samples: readonly number[]): Motion {
  const moves = steps(samples);
  const last = samples.at(-1) ?? 0;
  const travel = Math.abs(last - (samples[0] ?? 0));

  return {
    reversals: countReversals(moves),
    overshoot: overshootOf(samples, last),
    largestStepShare: largestShare(moves, travel),
    travel,
  };
}
