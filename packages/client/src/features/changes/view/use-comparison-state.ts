import type { SessionComparison } from '@repo/contracts';
import { useCallback, useState } from 'react';
import type { ChangesComparison } from './changes-comparison';

type Keyed<Value> = { key: string; value: Value };

type Update<Value> = (next: (last: Value) => Value) => void;

const valueFor = <Value>(
  state: Keyed<Value>,
  key: string,
  initial: Value,
): Value => (state.key === key ? state.value : initial);

// An update that changes nothing keeps the state, so asking for it on every draw does not draw again.
function updated<Value>(last: Keyed<Value>, next: Keyed<Value>): Keyed<Value> {
  return Object.is(last.value, next.value) && last.key === next.key
    ? last
    : next;
}

type Comparison = ChangesComparison | SessionComparison;

// One string per distinct comparison; a branch's name cannot be mistaken for a kind.
function comparisonKey(comparison: Comparison): string {
  if (typeof comparison === 'string') return comparison;

  if ('branch' in comparison) return `branch:${comparison.branch}`;

  return comparison.kind;
}

// State that starts over from `initial`, which keeps its identity, whenever the comparison changes.
export function useComparisonState<Value>(
  comparison: Comparison,
  initial: Value,
): [Value, Update<Value>] {
  const key = comparisonKey(comparison);
  const [state, setState] = useState<Keyed<Value>>({ key, value: initial });

  const update = useCallback<Update<Value>>(
    (next) =>
      setState((last) =>
        updated(last, { key, value: next(valueFor(last, key, initial)) }),
      ),
    [key, initial],
  );

  return [valueFor(state, key, initial), update];
}
