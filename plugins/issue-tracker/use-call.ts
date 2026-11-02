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
export function useCall<Value>(call: () => Promise<Value>): Called<Value> {
  const [state, setState] = useState<State<Value>>();

  useEffect(() => {
    let current = true;

    call().then(
      (value) => {
        if (current) setState({ call, value, error: undefined });
      },
      (cause: unknown) => {
        if (current) setState({ call, value: undefined, error: String(cause) });
      },
    );

    return (): void => {
      current = false;
    };
  }, [call]);

  return state?.call === call ? state : waiting;
}
