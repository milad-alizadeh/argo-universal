import { useEffect } from '@argo/plugin-kit';

// The changed Issue's number.
type Listener = (number: number) => void;

// An Issue whose status changed on one page, told to the other open pages so their lists and counts load again.
export type IssueChanges = {
  subscribe: (listener: Listener) => () => void;
  publish: (number: number) => void;
};

export function createIssueChanges(): IssueChanges {
  const listeners = new Set<Listener>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    publish: (number) => {
      for (const listener of listeners) listener(number);
    },
  };
}

// An Issue whose status changed on another page may have left a list or joined it, so it loads again.
export function useReloadOnChange(
  changes: IssueChanges | undefined,
  reload: () => Promise<void>,
): void {
  useEffect(() => changes?.subscribe(() => void reload()), [changes, reload]);
}
