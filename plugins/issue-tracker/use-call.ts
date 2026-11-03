import { useEffect, useState } from '@argo/plugin-kit';
import type { Listeners } from './listeners';

export type Called<Value> = {
  // `undefined` until the call answers.
  value: Value | undefined;
  // Why the call failed, `undefined` until it does.
  error: string | undefined;
};

type State<Value> = Called<Value> & { call: () => Promise<Value> };

type Settle<Value> = (state: State<Value>) => void;

const waiting = { value: undefined, error: undefined } as const;

// Runs the call, and hands each answer to `settle` unless the effect has moved on.
function runCall<Value>(
  call: () => Promise<Value>,
  settle: Settle<Value>,
): () => void {
  let current = true;

  call().then(
    (value) => current && settle({ call, value, error: undefined }),
    (cause: unknown) =>
      current && settle({ call, value: undefined, error: String(cause) }),
  );

  return (): void => {
    current = false;
  };
}

// Runs the call now and again on each change, each run dropping the answer of the one before it.
function runOnChanges<Value>(
  call: () => Promise<Value>,
  settle: Settle<Value>,
  changes: Listeners['subscribe'] | undefined,
): () => void {
  let stopRun = runCall(call, settle);

  const stopHearing = changes?.(() => {
    stopRun();
    stopRun = runCall(call, settle);
  });

  return (): void => {
    stopRun();
    stopHearing?.();
  };
}

/*
 * Runs a `argo` call that is not a Query, such as listing Projects or reading a Session, again whenever `call`
 * changes, so wrap it in `useCallback`. Given `changes`, it also runs again on each one, and the last answer stays
 * while the next is read. GitHub is read with `useGitHub`, never with this.
 */
export function useCall<Value>(
  call: () => Promise<Value>,
  changes?: Listeners['subscribe'],
): Called<Value> {
  const [state, setState] = useState<State<Value>>();

  useEffect(() => runOnChanges(call, setState, changes), [call, changes]);

  return state?.call === call ? state : waiting;
}
