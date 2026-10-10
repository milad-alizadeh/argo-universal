import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import { fn } from 'storybook/test';
import type { ReadyNewSessionViewProps } from './new-session-view';

const [firstAgent] = newSessionCatalogs.bothAvailable;
const [firstProject] = newSessionProjects;
if (!firstAgent || !firstProject)
  throw new Error('Recorded mocks need an Agent and a Project.');
export const exampleProject = firstProject;

// New Session ready to open on the first Project and Agent, in a new worktree.
export const readyNewSession: ReadyNewSessionViewProps = {
  serverName: serverInfo.name,
  connected: true,
  projects: newSessionProjects,
  projectId: exampleProject.id,
  onProjectChange: fn(),
  configuration: {
    agents: newSessionCatalogs.bothAvailable,
    agent: firstAgent.agent,
    configOptions: firstAgent.configOptions,
    onConfigChange: fn(),
    onAgentChange: fn(),
    checkout: { branch: 'main', newWorktree: true, onNewWorktreeChange: fn() },
  },
  configReady: true,
  canOpen: true,
  opening: false,
  onOpen: fn(),
};
