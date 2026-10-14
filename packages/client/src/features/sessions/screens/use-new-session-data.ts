import type {
  AgentInfo,
  ProjectInfo,
  ProjectsBranchesOutput,
  SystemInfo,
} from '@repo/contracts';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { useAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  type ChosenSettings,
  chooseProject,
  type SessionChoices,
  toSessionChoices,
} from '../state/session-choices';

export interface NewSessionData {
  serverInfo: UseQueryResult<SystemInfo, unknown>;
  projects: UseQueryResult<ProjectInfo[], unknown>;
  agents: ReturnType<typeof useAgents>;
  setChosen: React.Dispatch<React.SetStateAction<ChosenSettings>>;
  choices: SessionChoices;
}

interface ListedChoices {
  projects: readonly ProjectInfo[];
  agents: readonly AgentInfo[];
}

type ChosenSessionChoices = Pick<NewSessionData, 'choices' | 'setChosen'>;

const isMain = (project: ProjectInfo | undefined): boolean =>
  project?.checkoutChoice.type === 'main';

function useProjectBranches(
  project: ProjectInfo | undefined,
): ProjectsBranchesOutput | undefined {
  const trpc = useTRPC();

  return useQuery(
    trpc.projects.branches.queryOptions(
      { projectId: project?.id ?? '' },
      { enabled: isMain(project) },
    ),
  ).data;
}

function useSessionChoices(
  listed: ListedChoices,
  projectId: string | undefined,
): ChosenSessionChoices {
  const [chosen, setChosen] = useState<ChosenSettings>({ projectId });

  const branches = useProjectBranches(
    chooseProject(listed.projects, chosen.projectId),
  );

  return {
    choices: toSessionChoices({ ...listed, chosen, branches }),
    setChosen,
  };
}

// The Server's Projects and Agents with the reader's choices over their defaults.
export function useNewSessionData(
  projectId: string | undefined,
): NewSessionData {
  const trpc = useTRPC();
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useAgents();

  const { choices, setChosen } = useSessionChoices(
    { projects: projects.data ?? [], agents: agents.data ?? [] },
    projectId,
  );

  return { serverInfo, projects, agents, setChosen, choices };
}
