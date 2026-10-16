import type { SessionConfigOption } from '@repo/contracts';
import { useEffect } from 'react';
import {
  type EmptySessionConfiguration,
  type LiveOptions,
} from '#features/sessions';
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

const liveOptions = (
  sessionId: string | undefined,
  configOptions: SessionConfigOption[] | undefined,
): LiveOptions | undefined =>
  sessionId && configOptions ? { sessionId, configOptions } : undefined;

// The open Session is brought to the reader's choices; a New worktree opens with them.
export function useConfigureStore(
  { session }: OpenedSession,
  configuration: EmptySessionConfiguration,
  live: SessionConfigOption[] | undefined,
): void {
  const sessionId = session.openSessionId;

  useEffect(() => {
    session.store.configure(configuration, liveOptions(sessionId, live));
  }, [session.store, configuration, sessionId, live]);
}
