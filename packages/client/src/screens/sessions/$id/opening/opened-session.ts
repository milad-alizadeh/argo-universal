import { useSessionFeed } from '#features/feed';
import type { NewSessionWiring } from './new-session-wiring';
import { useOptionChoices } from './opened-session-choices';
import { useConfigureStore, useShowsPrompt } from './opened-session-effects';
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
  const { view } = useSessionFeed(opened.session.openSessionId);
  const choices = useOptionChoices(opened);
  useShowsPrompt(opened, view?.items.length);
  useConfigureStore(opened, choices.configuration);

  return {
    discovery: choices.discovery,
    configuration: configurationOf(choices),
  };
}

const configurationOf = (
  choices: ReturnType<typeof useOptionChoices>,
): NewSessionWiring['configuration'] => ({
  configOptions: choices.configOptions,
  opening: choices.loading,
  onConfigChange: choices.pick,
});
