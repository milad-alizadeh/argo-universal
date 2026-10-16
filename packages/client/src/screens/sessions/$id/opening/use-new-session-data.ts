import type {
  AgentServer,
  ProjectInfo,
  ProjectsBranchesOutput,
  SystemInfo,
} from '@repo/contracts';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import {
  type InstalledAgents,
  loadedAgents,
  useInstalledAgents,
  useRememberedAgent,
} from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  type ChosenSettings,
  chooseProject,
  type SessionChoices,
  toSessionChoices,
} from '#features/sessions';

export interface NewSessionData {
  serverInfo: UseQueryResult<SystemInfo, unknown>;
  projects: UseQueryResult<ProjectInfo[], unknown>;
  agents: InstalledAgents;
  setChosen: React.Dispatch<React.SetStateAction<ChosenSettings>>;
  choices: SessionChoices;
}

interface ListedChoices {
  projects: readonly ProjectInfo[];
  agents: readonly AgentServer[];
}

type ChosenSessionChoices = Pick<NewSessionData, 'choices' | 'setChosen'>;

const isMain = (project: ProjectInfo | undefined): boolean =>
  project?.checkoutChoice.type === 'main';

function useProjectBranches(
  projects: readonly ProjectInfo[],
  projectId: string | undefined,
): ProjectsBranchesOutput | undefined {
  const project = chooseProject(projects, projectId);
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

  const rememberedAgent = useRememberChosenAgent(chosen.agent);
  const branches = useProjectBranches(listed.projects, chosen.projectId);

  const choices = toSessionChoices({
    ...listed,
    chosen,
    rememberedAgent,
    branches,
  });

  return { choices, setChosen };
}

// Remembers the chosen Agent on this device; returns the remembered one.
function useRememberChosenAgent(
  chosen: string | undefined,
): string | undefined {
  const { agent, select } = useRememberedAgent();
  useEffect(() => {
    if (chosen) select(chosen);
  }, [chosen, select]);

  return agent;
}

type ListedData = Pick<NewSessionData, 'projects' | 'agents'> & {
  listed: ListedChoices;
};

function useListedData(): ListedData {
  const projects = useQuery(useTRPC().projects.list.queryOptions());
  const agents = useInstalledAgents();

  const listed = {
    projects: projects.data ?? [],
    agents: loadedAgents(agents),
  };

  return { projects, agents, listed };
}

// The Server's Projects and Agents with the reader's choices over their defaults.
export function useNewSessionData(
  projectId: string | undefined,
): NewSessionData {
  const serverInfo = useQuery(useTRPC().system.info.queryOptions());
  const { projects, agents, listed } = useListedData();
  const { choices, setChosen } = useSessionChoices(listed, projectId);

  return { serverInfo, projects, agents, setChosen, choices };
}
