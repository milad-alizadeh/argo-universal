import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import type { useSheetNavigation } from '#primitives/overlays/bottom-sheet';

// The sheet a drill row pushes its page onto.
export type SheetNavigation = NonNullable<
  ReturnType<typeof useSheetNavigation>
>;

/*
 * A drill row's latest props, for the page it pushed: the page lives outside the row's tree, so it
 * reads the row's options and choice from here and follows them as they change.
 */
export type LiveProps<Props> = {
  get: () => Props;
  set: (props: Props) => void;
  subscribe: (listener: () => void) => () => void;
};

function createLiveProps<Props>(initial: Props): LiveProps<Props> {
  let current = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    set: (props) => {
      current = props;

      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

// The row's side: hands its props to the store after every render.
export function useLiveProps<Props>(props: Props): LiveProps<Props> {
  const [store] = useState(() => createLiveProps(props));
  useLayoutEffect(() => store.set(props));

  return store;
}

// The page's side: the row's latest props.
export function useLatestProps<Props>(store: LiveProps<Props>): Props {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
