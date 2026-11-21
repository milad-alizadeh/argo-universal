import { useState } from 'react';
import { afterKey, snap } from './fader-math';
import type { FaderProps } from './fader-props';

export interface FaderValue {
  value: number;
  hasPendingValue: boolean;
  set: (value: number) => void;
  nudge: (direction: 1 | -1) => void;
  onKey: (key: string) => boolean;
}

// A change the caller has not yet answered, and the value it was made from.
interface Draft {
  value: number;
  base: number;
}

const heldBy = (props: FaderProps): number => props.value ?? props.minimumValue;

const canMove = (props: FaderProps, value: number, next: number): boolean =>
  !props.disabled && next !== value;

// Tells the caller of a change; false when there is none to make.
function commit(props: FaderProps, value: number, next: number): boolean {
  if (!canMove(props, value, next)) return false;

  props.onValueChange?.(next);

  return true;
}

// Whether a key moved the value; the keys the control ignores are left to the page.
function pressKey(
  key: string,
  control: Pick<FaderValue, 'value' | 'set'> & { range: FaderProps },
): boolean {
  const next = afterKey(key, control.value, control.range);

  if (next !== undefined) control.set(next);

  return next !== undefined;
}

// The value on screen, held as a draft while the caller catches up, so a drag is smooth.
export function useFaderValue(props: FaderProps): FaderValue {
  const held = heldBy(props);
  const [draft, setDraft] = useState<Draft>();

  const pending = draft?.base === held ? draft : undefined;

  if (draft && !pending) setDraft(undefined);

  const value = pending?.value ?? held;

  const set = (next: number): void => {
    if (commit(props, value, next)) setDraft({ value: next, base: held });
  };

  return {
    value,
    hasPendingValue: pending !== undefined,
    set,
    nudge: (direction) => set(snap(value + direction * props.step, props)),
    onKey: (key) => pressKey(key, { value, set, range: props }),
  };
}
