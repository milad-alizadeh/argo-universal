import type { ProjectInfo, SystemInfo } from '@repo/contracts';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAgents } from '#features/agents';
import {
  type ComposerDraft,
  savedChoicesQuery,
  useImageDraft,
} from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useNavigate } from '#lib/product/navigation/context';
import {
  NewSessionView,
  type NewSessionViewProps,
  type ReadyNewSessionViewProps,
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
  if (view.state !== 'ready' || !opened) return <NewSessionView {...view} />;
  return <OpenedNewSession key={opened.sessionId} {...opened} view={view} />;
}

const ignoreChange = (): void => {};

// The open empty Session's options, read from its Feed; this device's last choices go to it once.
function OpenedNewSession({
  sessionId,
  agent,
  actor,
  view,
}: OpenedSession & {
  view: { state: 'ready' } & ReadyNewSessionViewProps;
}): React.JSX.Element {
  const { snapshot } = useSessionFeed(sessionId);
  const saved = useQuery(savedChoicesQuery(agent));
  const configOptions = snapshot?.configOptions;
  useEffect(() => {
    if (configOptions && saved.data)
      actor.send({ type: 'options.loaded', configOptions, saved: saved.data });
  }, [actor, configOptions, saved.data]);
  const { change } = useSessionConfigChange(sessionId, agent, ignoreChange);
  return (
    <NewSessionView
      {...view}
      configuration={{
        ...view.configuration,
        configOptions: configOptions ?? [],
        onConfigChange: change,
      }}
    />
  );
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
  const imageDraft = useImageDraft();
  // The first prompt as sent, shown in the Feed until the Session has it; a failure clears it and keeps the draft.
  const [sent, setSent] = useState<{ draft: ComposerDraft; at: number }>();
  const waiting =
    session.context.pendingPrompt !== undefined || session.handedOff;
  const shownSent =
    sent && (imageDraft.uploading || waiting) ? sent : undefined;
  const starting = useMemo(
    () => shownSent && startingFeed(shownSent.draft, shownSent.at),
    [shownSent],
  );
  // Uploads the draft's images, then queues the draft as the first prompt until the Session is ready.
  async function sendFirstPrompt(draft: ComposerDraft): Promise<void> {
    setSent({ draft, at: Date.now() });
    const prompt = await imageDraft.uploadDraftAsPrompt(draft);
    if (prompt?.length) session.actor.send({ type: 'send', prompt });
    else setSent(undefined);
  }

  if (serverInfo.isError || projects.isError || agents.isError)
    return { view: { state: 'load-failed' } };
  if (!serverInfo.data || !projects.data || !agents.data)
    return { view: { state: 'loading' } };

  const { agent } = choices;
  const sending = imageDraft.uploading || waiting;
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
      draft: imageDraft.draft,
      onDraftChange: imageDraft.changeDraft,
      onAttachImages: () => void imageDraft.attachImages(),
      onSend: (draft) => void sendFirstPrompt(draft),
      canOpen: canOpenSession({
        connected,
        choices,
        sending,
        handedOff: session.handedOff,
      }),
      opening: sending,
      starting,
      attachmentError: imageDraft.attachmentError?.message,
      setupStep:
        agent && agent.availability !== 'available'
          ? agent.installStep
          : undefined,
      openError: session.context.error,
    },
  };
}
