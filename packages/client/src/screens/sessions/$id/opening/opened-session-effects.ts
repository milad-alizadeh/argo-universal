import { useEffect } from 'react';
import type { useSessionFeed } from '#features/feed';
import { type EmptySessionConfiguration } from '#features/sessions';
import type { OpenedSession } from './opened-session';
import { useModelCorrection } from './use-model-correction';

function useShowsPrompt(
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

// What the opened Session's Feed tells the screen: its prompt is shown, and the Agent may have changed a choice.
export function useFeedEffects(
  opened: OpenedSession,
  feed: ReturnType<typeof useSessionFeed>,
  configuration: EmptySessionConfiguration,
): void {
  useShowsPrompt(opened, feed.view?.items.length);
  useModelCorrection(configuration, feed.snapshot);
}
