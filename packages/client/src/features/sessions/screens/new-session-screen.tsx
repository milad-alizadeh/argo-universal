import type {
  ProjectInfo,
  SessionConfigOption,
  SystemInfo,
} from '@repo/contracts';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useAgents } from '#features/agents';
import {
  type ComposerDraft,
  savedChoicesQuery,
  useAttachmentDraft,
} from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useNavigate } from '#lib/product/navigation/context';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../components/new-session-view/new-session-view';
import {
  type EmptySessionActor,
  useEmptySession,
} from '../hooks/use-empty-session';
import { useSessionConfigChange } from '../hooks/use-session-config-change';
import { canOpenSession, toNewSessionInput } from '../state/open-session';
import {
  type ChosenSettings,
  chooseAnotherProject,
  chooseProject,
  type SessionChoices,
  toSessionChoices,
} from '../state/session-choices';
import { startingFeed } from '../state/starting-feed';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

interface OpenedSession {
  sessionId: string;
  agent: string;
  actor: EmptySessionActor;
}

export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  const { view, opened } = useNewSessionViewProps(projectId);
  const [read, setRead] = useState<ReadOptions>();
  const options =
    opened && read?.sessionId === opened.sessionId ? read : undefined;
  const { change } = useSessionConfigChange(
    opened?.sessionId ?? '',
    opened?.agent,
    ignoreChange,
  );
  return (
    <>
      {opened && (
        <EmptySessionOptions
          key={opened.sessionId}
          {...opened}
          onRead={setRead}
        />
      )}
      <NewSessionView
        {...withOpenedOptions(view, options?.configOptions, change)}
      />
    </>
  );
}

interface ReadOptions {
  sessionId: string;
  configOptions: SessionConfigOption[];
}

const ignoreChange = (): void => {};

// The open Session's options take the Composer's place, with changes going to that Session.
const withOpenedOptions = (
  view: NewSessionViewProps,
  configOptions: SessionConfigOption[] | undefined,
  change: (configId: string, value: string | boolean) => void,
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

// The open empty Session's options, read from its Feed; this device's last choices go to it once.
function EmptySessionOptions({
  sessionId,
  agent,
  actor,
  onRead,
}: OpenedSession & {
  onRead: (options: ReadOptions) => void;
}): null {
  const { snapshot, view } = useSessionFeed(sessionId);
  const saved = useQuery(savedChoicesQuery(agent));
  const configOptions = snapshot?.configOptions;
  // An empty Session has no rows; its first is the prompt.
  const showsPrompt = (view?.items.length ?? 0) > 0;
  useEffect(() => {
    if (showsPrompt) actor.send({ type: 'feed.showsPrompt' });
  }, [actor, showsPrompt]);
  useEffect(() => {
    if (configOptions) onRead({ sessionId, configOptions });
  }, [onRead, sessionId, configOptions]);
  useEffect(() => {
    if (configOptions && saved.data)
      actor.send({ type: 'options.loaded', configOptions, saved: saved.data });
  }, [actor, configOptions, saved.data]);
  return null;
}

interface NewSessionData {
  serverInfo: UseQueryResult<SystemInfo, unknown>;
  projects: UseQueryResult<ProjectInfo[], unknown>;
  agents: ReturnType<typeof useAgents>;
  setChosen: React.Dispatch<React.SetStateAction<ChosenSettings>>;
  choices: SessionChoices;
}

// The Server's Projects and Agents with the reader's choices over their defaults.
function useNewSessionData(projectId: string | undefined): NewSessionData {
  const trpc = useTRPC();
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useAgents();
  const [chosen, setChosen] = useState<ChosenSettings>({ projectId });
  const project = chooseProject(projects.data ?? [], chosen.projectId);
  const branches = useQuery(
    trpc.projects.branches.queryOptions(
      { projectId: project?.id ?? '' },
      { enabled: project?.checkoutChoice.type === 'main' },
    ),
  );
  const choices = toSessionChoices({
    projects: projects.data ?? [],
    agents: agents.data ?? [],
    chosen,
    branches: branches.data,
  });
  return { serverInfo, projects, agents, setChosen, choices };
}

const ignoreConfigChange = (): void => {};

function useNewSessionViewProps(projectId: string | undefined): {
  view: NewSessionViewProps;
  opened?: OpenedSession;
} {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const { serverInfo, projects, agents, choices } = data;
  const session = useEmptySession(toNewSessionInput(choices), connected);
  const attachmentDraft = useAttachmentDraft(
    choices.project && { type: 'new-session', projectId: choices.project.id },
  );
  useClearDraftOnHandOff(session.handedOff, attachmentDraft.clearDraft);
  // The first prompt as sent, shown in the Feed until the Session has it; a failure clears it and keeps the draft.
  const [sent, setSent] = useState<{ draft: ComposerDraft; at: number }>();
  const waiting =
    session.context.pendingPrompt !== undefined || session.handedOff;
  const shownSent =
    sent && (attachmentDraft.uploading || waiting) ? sent : undefined;
  const starting = useMemo(
    () => shownSent && startingFeed(shownSent.draft, shownSent.at),
    [shownSent],
  );
  // Uploads the draft's images, then queues the draft as the first prompt until the Session is ready.
  async function sendFirstPrompt(draft: ComposerDraft): Promise<void> {
    setSent({ draft, at: Date.now() });
    const prompt = await attachmentDraft.uploadDraftAsPrompt(draft);
    if (prompt?.length) session.actor.send({ type: 'send', prompt });
    else setSent(undefined);
  }

  if (serverInfo.isError || projects.isError || agents.isError)
    return { view: { state: 'load-failed' } };
  if (!serverInfo.data || !projects.data || !agents.data)
    return { view: { state: 'loading' } };

  const { agent } = choices;
  const sending = attachmentDraft.uploading || waiting;
  const opened =
    session.openSessionId && agent
      ? {
          sessionId: session.openSessionId,
          agent: agent.agent,
          actor: session.actor,
        }
      : undefined;
  return {
    opened,
    view: {
      state: 'ready',
      serverName: serverInfo.data.name,
      connected,
      projects: projects.data,
      projectId: choices.project?.id ?? '',
      onProjectChange: (id) =>
        data.setChosen((current) => chooseAnotherProject(current, id)),
      configuration: {
        agents: agents.data,
        agent: agent?.agent ?? '',
        configOptions: [],
        onConfigChange: ignoreConfigChange,
        opening: session.opening,
        onAgentChange: (next) =>
          data.setChosen((current) => ({ ...current, agent: next })),
        onAgentSetup: (setup) =>
          navigate({ to: 'settings-agent', agent: setup }),
        onAgentRetry: agents.retry,
        checkout: {
          branch: choices.baseBranch,
          newWorktree: choices.inNewWorktree,
          onNewWorktreeChange: (newWorktree) =>
            data.setChosen((current) => ({ ...current, newWorktree })),
        },
      },
      draft: attachmentDraft.draft,
      onDraftChange: attachmentDraft.changeDraft,
      onAttachImages: () => void attachmentDraft.attachImages(),
      onAttachFiles: () => void attachmentDraft.attachFiles(),
      onDropFiles: (dropped) =>
        void attachmentDraft.attachDroppedFiles(dropped),
      onSend: (draft) => void sendFirstPrompt(draft),
      canOpen: canOpenSession({
        connected,
        choices,
        sending,
        handedOff: session.handedOff,
      }),
      opening: sending,
      starting,
      attachmentError: attachmentDraft.attachmentError?.message,
      setupStep:
        agent && agent.availability !== 'available'
          ? agent.installStep
          : undefined,
      openError: session.context.error,
    },
  };
}

// The first prompt now belongs to the Session, so the Project's kept draft goes.
function useClearDraftOnHandOff(
  handedOff: boolean,
  clearDraft: () => void,
): void {
  const clear = useEffectEvent(clearDraft);
  useEffect(() => {
    if (handedOff) clear();
  }, [handedOff]);
}
