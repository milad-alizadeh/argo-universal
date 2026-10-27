import { useCallback, useEffect, useRef, useState } from '@argo/plugin-kit';
import {
  edited,
  failed,
  owned,
  shown,
  unowned,
  type State,
} from './async-state';

export type Show<Value> = (value: Value) => void;

// Answers the value, and may `show` an earlier one first, such as a cached answer.
export type Load<Value> = (show: Show<Value>) => Promise<Value>;

export type Update<Value> = (value: Value | undefined) => Value | undefined;

export type Async<Value> = {
  // `undefined` until a load shows one; a failed load keeps the last.
  value: Value | undefined;
  // The last load's failure, `undefined` until one fails and again once a value is shown.
  error: string | undefined;
  // Changes the value at once, such as an optimistic edit; the failure is cleared with it.
  set: (update: Update<Value>) => void;
  // Runs a load again, `next` instead of the hook's own, keeping the value on screen.
  reload: (next?: Load<Value>) => Promise<void>;
};

type SetState<Value> = (
  update: (previous: State<Value>) => State<Value>,
) => void;

type Run<Value> = {
  load: Load<Value>;
  setState: SetState<Value>;
  isCurrent: () => boolean;
};

async function run<Value>(next: Load<Value>, using: Run<Value>): Promise<void> {
  const { load, setState, isCurrent } = using;

  const show = (value: Value): void => {
    if (isCurrent()) setState((state) => shown(state, load, value));
  };

  try {
    show(await next(show));
  } catch (cause) {
    if (isCurrent()) setState((state) => failed(state, load, cause));
  }
}

// Whether no newer `load` or unmount has come since this call.
const startedAt = (generation: { current: number }): (() => boolean) => {
  const started = generation.current;

  return () => generation.current === started;
};

// Runs `load` when it changes, and drops what a `load` answers after it is replaced or the component unmounts.
function useReload<Value>(
  load: Load<Value>,
  setState: SetState<Value>,
): Async<Value>['reload'] {
  const generation = useRef(0);

  const reload = useCallback(
    (next: Load<Value> = load) =>
      run(next, { load, setState, isCurrent: startedAt(generation) }),
    [load, setState],
  );

  useLoadOnChange(reload, generation);

  return reload;
}

function useLoadOnChange(
  reload: () => Promise<void>,
  generation: { current: number },
): void {
  useEffect(() => {
    void reload();

    return (): void => {
      generation.current += 1;
    };
  }, [reload, generation]);
}

/*
 * The Plugin's one way to read what loads asynchronously: a value, the failure that stopped it, an
 * edit, and a reload. Wrap `load` in `useCallback`; a new `load` starts from nothing.
 */
export function useAsync<Value>(load: Load<Value>): Async<Value> {
  const [state, setState] = useState<State<Value>>(unowned);
  const reload = useReload(load, setState);

  const set = useCallback<Async<Value>['set']>(
    (update): void => setState((previous) => edited(previous, load, update)),
    [load],
  );

  const { value, error } = owned(state, load);

  return { value, error, set, reload };
}
