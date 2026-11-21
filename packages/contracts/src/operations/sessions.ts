import {
  SessionArchiveInput,
  SessionArchiveOutput,
  SessionUnarchiveInput,
  SessionUnarchiveOutput,
} from '../sessions/archive';
import { SessionCancelInput, SessionCancelOutput } from '../sessions/cancel';
import { SessionNewOutput, SessionNewParams } from '../sessions/new';
import { SessionOpenInput } from '../sessions/open';
import { SessionPromptInput, SessionPromptOutput } from '../sessions/prompt';
import { SessionRenameOutput, SessionRenameParams } from '../sessions/rename';
import {
  SessionSavePlanInput,
  SessionSavePlanOutput,
} from '../sessions/save-plan';
import {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '../sessions/set-config-option';
import type { OperationDefinition } from './index';
import { scheduleOperations } from './schedules';
import { sessionAgentOperations } from './session-agent-operations';
import { queueOperations } from './session-queue-operations';
import { sessionRestartOperations } from './session-restart-operations';
import { shellOperations } from './shells';

export const sessionOperations = {
  ...scheduleOperations,
  ...queueOperations,
  'session.new': {
    id: 'session.new',
    label: 'Start Session',
    icon: 'new-session',
    description:
      'Start a Session with an Agent, Checkout and optional first prompt. A Session may pass the `starter` Checkout to run the new Session in its own working tree, uncommitted changes included. A worktree Checkout can name its branch. If that branch is held by a clean unowned linked worktree, the conflict reports its path and offers a retry with checkout.takenBranch.',
    params: SessionNewParams,
    result: SessionNewOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['create', 'delegate', 'agent', 'parallel', 'subagent'],
  },
  'session.handoff': {
    id: 'session.handoff',
    label: 'Handoff Session',
    icon: 'arrow-right',
    description:
      'Generate a handoff document and open a fresh Session in the same Checkout.',
    params: SessionOpenInput,
    result: SessionNewOutput,
    tier: 'act',
    policy: 'person-only',
    keywords: ['handoff', 'continue', 'checkout'],
  },
  'session.prompt': {
    id: 'session.prompt',
    label: 'Prompt Session',
    icon: 'message',
    description:
      'Send a prompt to a Session. An idle Session starts a Turn; a busy one takes it into its running Turn when its Agent supports steering, and otherwise queues it. The result says which: started, steered or queued.',
    params: SessionPromptInput,
    result: SessionPromptOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['message', 'steer', 'queue', 'continue', 'agent'],
  },
  'session.cancel': {
    id: 'session.cancel',
    label: 'Cancel Session',
    icon: 'close',
    description: 'Cancel the selected Session’s running Turn.',
    params: SessionCancelInput,
    result: SessionCancelOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['stop', 'interrupt', 'turn'],
  },
  'session.archive': {
    id: 'session.archive',
    label: 'Archive Session',
    icon: 'archive',
    description:
      'Archive a Session and remove its Checkout after the Undo window when safe. Work that would be lost needs approval.',
    params: SessionArchiveInput,
    result: SessionArchiveOutput,
    tier: 'act',
    policy: 'archive',
    keywords: ['archive', 'remove', 'checkout'],
  },
  'session.unarchive': {
    id: 'session.unarchive',
    label: 'Undo Session archive',
    icon: 'archive',
    description:
      'Restore an archived Session during its Undo window, before its Checkout is removed.',
    params: SessionUnarchiveInput,
    result: SessionUnarchiveOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['restore', 'undo', 'archive'],
  },
  ...shellOperations,
  'session.setConfigOption': {
    id: 'session.setConfigOption',
    label: 'Set Session option',
    icon: 'settings',
    description:
      'Apply an Agent configuration choice to a Session and return its current options.',
    params: SessionSetConfigOptionInput,
    result: SessionSetConfigOptionOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['model', 'mode', 'effort', 'configuration', 'switch'],
  },
  'session.savePlan': {
    id: 'session.savePlan',
    label: 'Save Written plan',
    icon: 'plan-mode',
    description:
      'Save a Written plan the person asked to keep as a new Markdown file under .argo/plans in the Session Checkout. Never for a Todo list: run session.setTodos.',
    params: SessionSavePlanInput,
    result: SessionSavePlanOutput,
    // An Agent that calls it asks the person first: a checklist saved here was committed with the work (ADR-0053).
    tier: 'confirm',
    policy: 'ask',
    keywords: ['written plan', 'markdown', 'file'],
  },
  ...sessionAgentOperations,
  ...sessionRestartOperations,
  'session.rename': {
    id: 'session.rename',
    label: 'Rename Session',
    icon: 'rename',
    description:
      'Set the title shown for a Session in the Sessions list and Feed.',
    params: SessionRenameParams,
    result: SessionRenameOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['title', 'name'],
  },
} as const satisfies Record<string, OperationDefinition>;
