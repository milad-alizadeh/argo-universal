import { useSyncExternalStore } from 'react';

const dismissed = new Map<string, string>();

const listeners = new Set<() => void>();

type FollowUpDismissal = {
  turnId: string | undefined;
  dismiss: (turnId: string) => void;
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

function dismiss(sessionId: string, turnId: string): void {
  if (dismissed.get(sessionId) === turnId) return;

  dismissed.set(sessionId, turnId);

  for (const listener of listeners) listener();
}

export function useFollowUpDismissal(sessionId: string): FollowUpDismissal {
  const turnId = useSyncExternalStore(subscribe, () =>
    dismissed.get(sessionId),
  );

  return { turnId, dismiss: (next) => dismiss(sessionId, next) };
}
