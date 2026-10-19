import { useSessionFeed } from '#features/feed';
import { useCacheSessionOptions } from '#features/sessions';
import type { NewSessionWiring } from './new-session-wiring';
import { useOptionChoices, useConfigChange } from './opened-session-choices';
import { useConfigureStore, useShowsPrompt } from './opened-session-effects';
import type { EmptySession } from './use-empty-session';

export interface OpenedSession {
  session: EmptySession;
  agent: string | undefined;
  projectId: string | undefined;
  inNewWorktree: boolean;
}

export const openedSession = ({
  sessionOpening,
  data,
}: NewSessionWiring): OpenedSession => ({
  session: sessionOpening.session,
  agent: data.choices.agent?.id,
  projectId: data.choices.project?.id,
  inNewWorktree: data.choices.inNewWorktree,
});

// The cached options with the reader's choices; the open Session is brought to them, and a New worktree opens with them.
export function useOpenedConfiguration(
  opened: OpenedSession,
): NewSessionWiring['configuration'] {
  const { snapshot, view } = useSessionFeed(opened.session.openSessionId);
  const live = snapshot?.configOptions;
  const choices = useOptionChoices(opened);
  useCacheSessionOptions(snapshot);
  useShowsPrompt(opened, view?.items.length);
  useConfigureStore(opened, choices.configuration, live);

  return {
    configOptions: choices.configOptions,
    opening: choices.loading,
    onConfigChange: useConfigChange(opened, choices),
  };
}
