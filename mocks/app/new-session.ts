import {
  type AgentsListOutput,
  type SessionSetConfigOptionInput,
  type ProjectsBranchesOutput,
  type ProjectsListOutput,
  SessionConfigOption,
  SessionNewInput,
  type SystemInfo,
} from '@repo/contracts';
import { z } from 'zod';
import recordedOptions from './new-session-options.json';
import { agentsList, projectsList } from './session-list';

// Generated from both CLI catalogs by tools/generate-new-session-mocks.mts.
export const newSessionOptions = z
  .array(
    z.strictObject({
      agent: z.string(),
      configOptions: z.array(SessionConfigOption),
      configOptionsByModel: z.array(z.array(SessionConfigOption)),
      prompt: SessionNewInput.shape.prompt,
    }),
  )
  .parse(recordedOptions);

const available: AgentsListOutput = agentsList.map(
  (agent): AgentsListOutput[number] => ({
    ...agent,
    configOptions:
      newSessionOptions.find(
        (options): boolean => options.agent === agent.agent,
      )?.configOptions ?? [],
  }),
);

export const newSessionCatalogs = {
  bothAvailable: available,
  bothUnavailable: available.map(
    (
      agent,
    ): Required<
      Omit<AgentsListOutput[number], 'availability' | 'configOptions'>
    > & { availability: 'unavailable'; configOptions: never[] } => ({
      ...agent,
      availability: 'unavailable' as const,
      installStep: "CLI didn't start",
      configOptions: [],
    }),
  ),
  oneNotInstalled: available.map((agent, index): AgentsListOutput[number] =>
    index === 0
      ? {
          ...agent,
          availability: 'not_installed' as const,
          installStep: 'Install this Agent on the Server.',
          configOptions: [],
        }
      : agent,
  ),
  oneNotSignedIn: available.map((agent, index): AgentsListOutput[number] =>
    index === 1
      ? {
          ...agent,
          availability: 'not_signed_in' as const,
          installStep: 'Sign in to this Agent on the Server.',
          configOptions: [],
        }
      : agent,
  ),
};

export const newSessionBranches: ProjectsBranchesOutput = {
  branches: ['main', 'feature/new-session', 'release'],
  currentBranch: 'main',
};

export const newSessionInputs: SessionNewInput[] = newSessionOptions.map(
  ({ agent, configOptions, prompt }): SessionNewInput => ({
    projectId: projectsList[0]?.id ?? 'project-1',
    agent,
    checkout: { type: 'worktree', baseBranch: 'main' },
    configOptions: configOptions.map(
      ({
        configId,
        currentValue,
      }): Pick<SessionSetConfigOptionInput, 'configId' | 'value'> => ({
        configId,
        value: currentValue,
      }),
    ),
    prompt,
  }),
);

// A second Project, kept on its main checkout, for the Project picker.
export const newSessionProjects: ProjectsListOutput = [
  ...projectsList,
  {
    id: 'project-2',
    name: 'Landing Page',
    path: '/projects/landing-page',
    createdAt: (projectsList[0]?.createdAt ?? 0) + 1,
    checkoutChoice: { type: 'main' },
  },
];

export const serverInfo: SystemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T09:00:00.000Z',
  pid: 4242,
  name: "Milad's Mac mini",
};
