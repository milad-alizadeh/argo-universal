import { useEffect, useState } from '@argo/plugin-kit';

export type Called<Value> = {
  // `undefined` until the call answers.
  value: Value | undefined;
  // Why the call failed, `undefined` until it does.
  error: string | undefined;
};

type State<Value> = Called<Value> & { call: () => Promise<Value> };

const waiting = { value: undefined, error: undefined } as const;

/*
 * Runs a `argo` call that is not a Query, such as listing Projects or reading a Session, again whenever `call`
 * changes, so wrap it in `useCallback`. GitHub is read with `useGitHub`, never with this.
 */
// Runs the call, and hands each answer to `settle` unless the effect has moved on.
function runCall<Value>(
  call: () => Promise<Value>,
  settle: (state: State<Value>) => void,
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

export function useCall<Value>(call: () => Promise<Value>): Called<Value> {
  const [state, setState] = useState<State<Value>>();

  useEffect(() => runCall(call, setState), [call]);

  return state?.call === call ? state : waiting;
}
