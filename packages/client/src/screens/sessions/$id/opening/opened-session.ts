import { useSessionFeed } from '#features/feed';
import { useSessionOptions } from '#features/sessions';
import type { NewSessionWiring } from './new-session-wiring';
import { useConfigureStore, useFeedEffects } from './opened-session-effects';
import type { EmptySession } from './use-empty-session';

export interface OpenedSession {
  session: EmptySession;
  agent: string | undefined;
  projectId: string | undefined;
}

export const openedSession = ({
  sessionOpening,
  data,
}: Omit<NewSessionWiring, 'callout'>): OpenedSession => ({
  session: sessionOpening.session,
  agent: data.choices.agent?.id,
  projectId: data.choices.project?.id,
});

// Server options and unsent choices; the Feed is read only after Send.
export function useOpenedConfiguration(
  opened: OpenedSession,
): Pick<NewSessionWiring, 'configuration' | 'discovery'> {
  const feed = useSessionFeed(opened.session.openSessionId);

  const choices = useSessionOptions({
    agent: opened.agent,
    projectId: opened.projectId,
  });

  useFeedEffects(opened, feed, choices.configuration);
  useConfigureStore(opened, choices.configuration);

  return {
    discovery: choices,
    configuration: configurationOf(choices),
  };
}

const configurationOf = (
  choices: ReturnType<typeof useSessionOptions>,
): NewSessionWiring['configuration'] => ({
  configOptions: choices.configOptions,
  opening: choices.loading,
  onConfigChange: choices.pick,
});
