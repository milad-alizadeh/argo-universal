import type { ProjectInfo, SystemInfo } from '@repo/contracts';
import {
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { useAgents } from '#features/agents';
import { useNewSessionConfiguration } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../components/new-session-view';
import { canOpenSession, toNewSessionInput } from '../state/open-session';
import {
  type ChosenSettings,
  chooseAnotherProject,
  chooseProject,
  type SessionChoices,
  toSessionChoices,
} from '../state/session-choices';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  return <NewSessionView {...useNewSessionViewProps(projectId)} />;
}

interface NewSessionData {
  serverInfo: UseQueryResult<SystemInfo, unknown>;
  projects: UseQueryResult<ProjectInfo[], unknown>;
  agents: ReturnType<typeof useAgents>;
  setChosen: React.Dispatch<React.SetStateAction<ChosenSettings>>;
  choices: SessionChoices;
  configuration: ReturnType<typeof useNewSessionConfiguration>;
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
  const configuration = useNewSessionConfiguration(choices.agent);
  return { serverInfo, projects, agents, setChosen, choices, configuration };
}

function useNewSessionViewProps(
  projectId: string | undefined,
): NewSessionViewProps {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const { serverInfo, projects, agents, choices, configuration } = data;
  const newSession = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      onError: () => void agents.refetch(),
    }),
  );

  if (serverInfo.isError || projects.isError || agents.isError)
    return {
      state: 'load-failed',
      onRetry: () => {
        void serverInfo.refetch();
        void projects.refetch();
        void agents.refetch();
      },
    };
  if (!serverInfo.data || !projects.data || !agents.data)
    return { state: 'loading' };

  const choose = (next: Partial<ChosenSettings>): void => {
    data.setChosen((current) => ({ ...current, ...next }));
    newSession.reset();
  };
  const sessionInput = toNewSessionInput(choices, configuration.configOptions);
  const { agent } = choices;
  return {
    state: 'ready',
    serverName: serverInfo.data.name,
    connected,
    projects: projects.data,
    projectId: choices.project?.id ?? '',
    onProjectChange: (id) => {
      data.setChosen((current) => chooseAnotherProject(current, id));
      newSession.reset();
    },
    configuration: {
      agents: agents.data,
      agent: agent?.agent ?? '',
      configOptions: configuration.configOptions,
      onConfigChange: configuration.change,
      onAgentChange: (next) => choose({ agent: next }),
      onAgentSetup: (setup) => navigate({ to: 'settings-agent', agent: setup }),
      onAgentRetry: agents.retry,
      checkout: {
        branch: choices.baseBranch,
        newWorktree: choices.inNewWorktree,
        onNewWorktreeChange: (newWorktree) =>
          data.setChosen((current) => ({ ...current, newWorktree })),
      },
    },
    configReady: configuration.ready,
    canOpen: canOpenSession({
      connected,
      choices,
      configReady: configuration.ready,
      opening: newSession.isPending,
    }),
    opening: newSession.isPending,
    onOpen: () => {
      if (sessionInput) newSession.mutate(sessionInput);
    },
    setupStep:
      agent && agent.availability !== 'available'
        ? agent.installStep
        : undefined,
    openError: newSession.error?.message,
  };
}
