import type { SessionConfigOption } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { savedChoicesQuery } from '#features/composer';
import { useSessionFeed } from '#features/feed';
import { useSessionConfigChange } from '#features/sessions';
import type { NewSessionWiring } from './new-session-wiring';
import type { EmptySessionActor } from './use-empty-session';

export interface OpenedSession {
  sessionId: string | undefined;
  agent: string | undefined;
  actor: EmptySessionActor;
}

export const openedSession = ({
  sessionOpening,
  data,
}: NewSessionWiring): OpenedSession => {
  const { actor, openSessionId } = sessionOpening.session;
  const agent = data.choices.agent?.agent;

  return { sessionId: openSessionId, actor, agent };
};

function useShowsPrompt(
  actor: EmptySessionActor,
  rowCount: number | undefined,
): void {
  const showsPrompt = (rowCount ?? 0) > 0;
  useEffect(() => {
    if (showsPrompt) actor.send({ type: 'feed.showsPrompt' });
  }, [actor, showsPrompt]);
}

function useApplySavedChoices(
  { agent, actor, sessionId }: OpenedSession,
  configOptions: SessionConfigOption[] | undefined,
): void {
  const saved = useQuery({
    ...savedChoicesQuery(agent ?? ''),
    enabled: sessionId !== undefined,
  });

  useEffect(() => {
    if (configOptions && saved.data)
      actor.send({ type: 'options.loaded', configOptions, saved: saved.data });
  }, [actor, configOptions, saved.data]);
}

const sessionIdForChange = ({ sessionId }: OpenedSession): string =>
  sessionId ?? '';

const ignoreChange = (): void => {};

// Configuration is read from the Feed snapshot, never relayed through React state.
export function useOpenedConfiguration(
  opened: OpenedSession,
): NewSessionWiring['configuration'] {
  const { snapshot, view } = useSessionFeed(opened.sessionId);
  const configOptions = snapshot?.configOptions;

  const { change } = useSessionConfigChange(
    sessionIdForChange(opened),
    opened.agent,
    ignoreChange,
  );

  useShowsPrompt(opened.actor, view?.items.length);
  useApplySavedChoices(opened, configOptions);

  return configurationOf(configOptions, change);
}

const configurationOf = (
  configOptions: SessionConfigOption[] | undefined,
  onConfigChange: NonNullable<
    NewSessionWiring['configuration']
  >['onConfigChange'],
): NewSessionWiring['configuration'] =>
  configOptions ? { configOptions, onConfigChange } : undefined;
