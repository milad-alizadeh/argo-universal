import type { SessionConfigOption } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { savedChoicesQuery } from '#features/composer';
import { useSessionFeed } from '#features/feed';
import type { NewSessionViewProps } from '../components/new-session-view/new-session-view';
import type { EmptySessionActor } from '../hooks/use-empty-session';
import { useSessionConfigChange } from '../hooks/use-session-config-change';

export interface OpenedSession {
  sessionId: string;
  agent: string;
  actor: EmptySessionActor;
}

interface ReadOptions {
  sessionId: string;
  configOptions: SessionConfigOption[];
}

export interface OpenedOptions {
  // Undefined until the open Session's options are read.
  configOptions: SessionConfigOption[] | undefined;
  change: (configId: string, value: string | boolean) => void;
  onRead: (options: ReadOptions) => void;
}

const noSession = { sessionId: '', agent: undefined };
const ignoreChange = (): void => {};

const readFor = (
  read: ReadOptions | undefined,
  sessionId: string | undefined,
): SessionConfigOption[] | undefined =>
  read !== undefined && read.sessionId === sessionId
    ? read.configOptions
    : undefined;

// The open empty Session's options once read, and changes to them; the page itself does not wait on a change.
export function useOpenedOptions(opened?: OpenedSession): OpenedOptions {
  const [read, setRead] = useState<ReadOptions>();
  const { sessionId, agent } = opened ?? noSession;
  const { change } = useSessionConfigChange(sessionId, agent, ignoreChange);
  return {
    configOptions: readFor(read, opened?.sessionId),
    change,
    onRead: setRead,
  };
}

type EmptySessionOptionsProps = OpenedSession & {
  onRead: (options: ReadOptions) => void;
};

// The open Session's options take the Composer's place, with changes going to that Session.
export const withOpenedOptions = (
  view: NewSessionViewProps,
  { configOptions, change }: OpenedOptions,
): NewSessionViewProps =>
  view.state === 'ready' && configOptions
    ? {
        ...view,
        configuration: {
          ...view.configuration,
          configOptions,
          onConfigChange: change,
        },
      }
    : view;

// An empty Session has no rows; its first is the prompt.
function useShowsPrompt(
  actor: EmptySessionActor,
  rowCount: number | undefined,
): void {
  const showsPrompt = (rowCount ?? 0) > 0;
  useEffect(() => {
    if (showsPrompt) actor.send({ type: 'feed.showsPrompt' });
  }, [actor, showsPrompt]);
}

// This device's last choices go to the open Session once.
function useApplySavedChoices(
  { agent, actor }: OpenedSession,
  configOptions: SessionConfigOption[] | undefined,
): void {
  const saved = useQuery(savedChoicesQuery(agent));
  useEffect(() => {
    if (configOptions && saved.data)
      actor.send({ type: 'options.loaded', configOptions, saved: saved.data });
  }, [actor, configOptions, saved.data]);
}

// Reads the open empty Session's options, while there is one.
export function OpenedSessionReader({
  opened,
  onRead,
}: {
  opened: OpenedSession | undefined;
  onRead: OpenedOptions['onRead'];
}): React.JSX.Element | null {
  if (!opened) return null;
  return (
    <EmptySessionOptions key={opened.sessionId} {...opened} onRead={onRead} />
  );
}

// The open empty Session's options, read from its Feed.
function EmptySessionOptions(props: EmptySessionOptionsProps): null {
  const { sessionId, actor, onRead } = props;
  const { snapshot, view } = useSessionFeed(sessionId);
  const configOptions = snapshot?.configOptions;
  useShowsPrompt(actor, view?.items.length);
  useEffect(() => {
    if (configOptions) onRead({ sessionId, configOptions });
  }, [onRead, sessionId, configOptions]);
  useApplySavedChoices(props, configOptions);
  return null;
}
