import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
} from '../projects/branches';
import {
  SessionBranchesInput,
  SessionBranchesOutput,
} from '../sessions/changes';
import { SessionShellsInput, SessionShellsOutput } from '../sessions/shells';
import {
  SessionSubagentsInput,
  SessionSubagentsOutput,
} from '../sessions/subagent';
import type { OperationDefinition } from './index';

export const readerOperations = {
  'session.listAgents': {
    id: 'session.listAgents',
    label: 'List Session Agents',
    description:
      'List ACP-reported subagents for a Session with their latest Turn state and metrics.',
    params: SessionSubagentsInput,
    result: SessionSubagentsOutput,
    tier: 'read',
    keywords: ['acp', 'subagents', 'children'],
  },
  'session.listShells': {
    id: 'session.listShells',
    label: 'List Session Shells',
    description:
      'List the Shells recorded for a Session with their running state and whether they can be stopped.',
    params: SessionShellsInput,
    result: SessionShellsOutput,
    tier: 'read',
    keywords: ['terminal', 'command', 'process'],
  },
  'session.listBranches': {
    id: 'session.listBranches',
    label: 'List Session branches',
    description:
      'List local comparison branches for a Session Checkout with their full Git refs.',
    params: SessionBranchesInput,
    result: SessionBranchesOutput,
    tier: 'read',
    keywords: ['git', 'compare', 'diff'],
  },
  'project.listBranches': {
    id: 'project.listBranches',
    label: 'List Project branches',
    description:
      'List local branches in a Project and identify its current branch, or null for a detached HEAD.',
    params: ProjectsBranchesInput,
    result: ProjectsBranchesOutput,
    tier: 'read',
    keywords: ['git', 'checkout', 'branch'],
  },
} as const satisfies Record<string, OperationDefinition>;
