import { useEffect } from 'react';
import { type EmptySessionConfiguration } from '#features/new-session';
import type { OpenedSession } from './opened-session';

export function useShowsPrompt(
  { session }: OpenedSession,
  rowCount: number | undefined,
): void {
  const showsPrompt = (rowCount ?? 0) > 0;

  useEffect(() => {
    if (showsPrompt) session.store.feedShowsPrompt();
  }, [session.store, showsPrompt]);
}

// Pass the unsent configuration to the store.
export function useConfigureStore(
  { session }: OpenedSession,
  configuration: EmptySessionConfiguration,
): void {
  useEffect(() => {
    session.store.configure(configuration);
  }, [session.store, configuration]);
}
