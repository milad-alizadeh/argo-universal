import {
  SessionBranchesInput,
  SessionBranchesOutput,
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
} from '../sessions/changes';
import { SessionFeedInput, SessionFeedOutput } from '../sessions/feed';
import { SessionGetInput, SessionGetOutput } from '../sessions/get';
import { SessionListInput, SessionListOutput } from '../sessions/list';
import { SessionShellsInput, SessionShellsOutput } from '../sessions/shells';
import {
  SessionSubagentsInput,
  SessionSubagentsOutput,
} from '../sessions/subagent';
import type { OperationDefinition } from './index';

export const readerOperations = {
  'session.diff': {
    id: 'session.diff',
    label: 'Read Session diff',
    icon: 'diff',
    description:
      'Read a changed file’s unified diff in a Session Checkout, paged by diff lines.',
    params: SessionDiffInput,
    result: SessionDiffOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['git', 'patch', 'review', 'comparison'],
  },
  'session.changes': {
    id: 'session.changes',
    label: 'List Session changes',
    icon: 'changed-files',
    description:
      'Read changed files in a Session Checkout, paged by file, with totals for the whole comparison.',
    params: SessionChangesInput,
    result: SessionChangesOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['git', 'files', 'review', 'comparison'],
  },
  'session.feed': {
    id: 'session.feed',
    label: 'Read Session messages',
    icon: 'message',
    description:
      'Read recent Agent messages, with older pages by cursor; excludes thoughts, prompts and Tool calls.',
    params: SessionFeedInput,
    result: SessionFeedOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['feed', 'history', 'messages', 'review'],
  },
  'session.get': {
    id: 'session.get',
    label: 'Read Session',
    icon: 'message',
    description:
      'Read a Session snapshot, including its current Turn and pending input, without opening its Agent.',
    params: SessionGetInput,
    result: SessionGetOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['snapshot', 'status', 'progress'],
  },
  'session.list': {
    id: 'session.list',
    label: 'List Sessions',
    icon: 'sessions',
    description:
      'List Sessions in a Project, ordered by most recent activity, with filters and paging.',
    params: SessionListInput,
    result: SessionListOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['conversations', 'history', 'search'],
  },
  'session.listAgents': {
    id: 'session.listAgents',
    label: 'List Session Agents',
    icon: 'agent',
    description:
      'List ACP-reported subagents for a Session with their latest Turn state and metrics.',
    params: SessionSubagentsInput,
    result: SessionSubagentsOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['acp', 'subagents', 'children'],
  },
  'session.listShells': {
    id: 'session.listShells',
    label: 'List Session Shells',
    icon: 'terminal',
    description:
      'List the Shells recorded for a Session with their running state and whether they can be stopped.',
    params: SessionShellsInput,
    result: SessionShellsOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['terminal', 'command', 'process'],
  },
  'session.listBranches': {
    id: 'session.listBranches',
    label: 'List Session branches',
    icon: 'branch',
    description:
      'List local comparison branches for a Session Checkout with their full Git refs.',
    params: SessionBranchesInput,
    result: SessionBranchesOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['git', 'compare', 'diff'],
  },
} as const satisfies Record<string, OperationDefinition>;
