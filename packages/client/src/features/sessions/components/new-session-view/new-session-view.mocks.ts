import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import { fn } from 'storybook/test';
import type { ComposerDraft } from '#features/composer';
import { startingFeed } from '../../state/starting-feed';
import type { ReadyNewSessionViewProps } from './new-session-view';

const [firstAgent] = newSessionCatalogs.bothAvailable;
const [firstProject] = newSessionProjects;
if (!firstAgent || !firstProject)
  throw new Error('Recorded mocks need an Agent and a Project.');
export const exampleProject = firstProject;

// New Session ready for a first prompt on the first Project and Agent, in a new worktree.
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
  draft: { text: '', attachments: [] },
  onDraftChange: fn(),
  onAttachImages: fn(),
  onAttachFiles: fn(),
  onDropFiles: fn(),
  onSend: fn(),
  canOpen: true,
  opening: false,
};

// A first prompt typed and ready to send.
export const typedDraft: ComposerDraft = {
  text: 'Fix the flaky login test',
  attachments: [],
};

// The typed first prompt sent, while the Session opens.
export const startingNewSession: Partial<ReadyNewSessionViewProps> = {
  draft: typedDraft,
  opening: true,
  canOpen: false,
  starting: startingFeed(typedDraft, Date.now()),
};
