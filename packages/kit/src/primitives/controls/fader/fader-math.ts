import type { FaderProps } from './fader-props';

export type FaderRange = Pick<
  FaderProps,
  'minimumValue' | 'maximumValue' | 'step'
>;

// How many decimals a step carries, so snapping 0.1 steps does not leave 0.30000000000000004.
const decimalsOf = (step: number): number =>
  step.toString().split('.')[1]?.length ?? 0;

// The value on the nearest step, kept inside the range.
export function snap(value: number, range: FaderRange): number {
  const { minimumValue: min, maximumValue: max, step } = range;
  const stepped = min + Math.round((value - min) / step) * step;
  const clamped = Math.min(max, Math.max(min, stepped));

  return Number(clamped.toFixed(decimalsOf(step)));
}

// Where the value sits in the range, from 0 to 1.
export function fractionOf(value: number, range: FaderRange): number {
  const span = range.maximumValue - range.minimumValue;

  return span <= 0
    ? 0
    : Math.min(1, Math.max(0, (value - range.minimumValue) / span));
}

// The value a drag of `share` of the surface's length from `start` reaches.
export function dragged(
  start: number,
  share: number,
  range: FaderRange,
): number {
  return snap(start + share * (range.maximumValue - range.minimumValue), range);
}

type Move = (value: number, range: FaderRange) => number;

const pageSteps = 10;

const by =
  (steps: number): Move =>
  (value, range) =>
    value + steps * range.step;

const end =
  (which: 'minimumValue' | 'maximumValue'): Move =>
  (_, range) =>
    range[which];

const keyMoves = new Map<string, Move>([
  ['ArrowUp', by(1)],
  ['ArrowRight', by(1)],
  ['ArrowDown', by(-1)],
  ['ArrowLeft', by(-1)],
  ['PageUp', by(pageSteps)],
  ['PageDown', by(-pageSteps)],
  ['Home', end('minimumValue')],
  ['End', end('maximumValue')],
]);

// The value a key reaches from `value`, or none for a key the control ignores.
export function afterKey(
  key: string,
  value: number,
  range: FaderRange,
): number | undefined {
  const move = keyMoves.get(key);

  return move && snap(move(value, range), range);
}
