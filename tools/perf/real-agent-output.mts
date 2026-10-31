/*
 * What a real Agent streamed while a scenario scrolled the Feed, as a condition of the run.
 *
 * A real Agent's output rate is not reproducible: the same prompt to the same model streams at a
 * different rate on a different day, and a slow provider is not a regression in the App. PF-17
 * therefore asserts frame timings during whatever output arrived and records the rate beside them,
 * so two runs can be compared knowing how much output each one drew. A pass in which nothing
 * streamed at all is the one failure here: it measured scrolling over a still Feed, which the
 * `feed` scenario already measures.
 */

// The Server's own row counter for the Session, read either side of the measured pass.
export interface OutputWindow {
  revisionBefore: number;
  revisionAfter: number;
  durationMs: number;
}

export interface OutputRate {
  rows: number;
  durationMs: number;
  rowsPerSecond: number;
}

export function outputRate({
  revisionBefore,
  revisionAfter,
  durationMs,
}: OutputWindow): OutputRate {
  const rows = revisionAfter - revisionBefore;

  return {
    rows,
    durationMs,
    rowsPerSecond: durationMs > 0 ? (rows * 1000) / durationMs : 0,
  };
}

// Why this pass measured no live output, or undefined when the Agent streamed something.
export const noOutputFailure = ({ rows }: OutputRate): string | undefined =>
  rows > 0
    ? undefined
    : 'The Agent added no Feed rows while this pass scrolled, so the pass measured scrolling over a still Feed rather than scrolling during live output.';
