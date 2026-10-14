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

// The configuration a recorded empty Session of `agent` returned before its first prompt.
export function recordedSessionOptions(agent: string): SessionConfigOption[] {
  const recorded = newSessionOptions.find((entry) => entry.agent === agent);

  if (!recorded) throw new Error(`No recorded Session options for ${agent}.`);

  return recorded.configOptions;
}

export const newSessionCatalogs = {
  bothReady: agentsList,
  bothCantStart: agentsList.map((agent): AgentsListOutput[number] => ({
    ...agent,
    status: 'cant-start',
    reason: "The Agent's CLI didn't start.",
  })),
  oneNotInstalled: agentsList.map((agent, index): AgentsListOutput[number] =>
    index === 0 ? { ...agent, status: 'not-installed' } : agent,
  ),
  oneSignInNeeded: agentsList.map((agent, index): AgentsListOutput[number] =>
    index === 1
      ? {
          ...agent,
          status: 'sign-in-needed',
          reason: 'The Agent requires sign-in.',
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
    remoteHost: null,
    folderExists: true,
  },
];

export const serverInfo: SystemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T09:00:00.000Z',
  pid: 4242,
  name: "Milad's Mac mini",
};
