import { z } from 'zod';
import { SessionQueueInput, SessionSubmitInput } from '../sessions';
import {
  SessionArchiveInput,
  SessionArchiveOutput,
  SessionUnarchiveInput,
  SessionUnarchiveOutput,
} from '../sessions/archive';
import { SessionCancelInput, SessionCancelOutput } from '../sessions/cancel';
import { SessionCloseInput, SessionCloseOutput } from '../sessions/close';
import { SessionNewInput, SessionNewOutput } from '../sessions/new';
import { SessionPromptInput, SessionPromptOutput } from '../sessions/prompt';
import { SessionRenameInput, SessionRenameOutput } from '../sessions/rename';
import {
  SessionSavePlanInput,
  SessionSavePlanOutput,
} from '../sessions/save-plan';
import {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '../sessions/set-config-option';
import type { OperationDefinition } from './index';
import { sessionAgentOperations } from './session-agent-operations';
import { sessionRestartOperations } from './session-restart-operations';
import { shellOperations } from './shells';

export const sessionOperations = {
  'session.submit': {
    id: 'session.submit',
    label: 'Submit Prompt',
    icon: 'message',
    description:
      'Submit a user Prompt from an App, queuing it while the Session is busy or paused.',
    params: SessionSubmitInput,
    result: z.strictObject({}),
    tier: 'act',
    keywords: ['prompt', 'queue'],
  },
  'session.queue': {
    id: 'session.queue',
    label: 'Manage Prompt queue',
    icon: 'checklist',
    description: 'Append, edit, delete, reorder or resume Queued Prompts.',
    params: SessionQueueInput,
    result: z.strictObject({}),
    tier: 'act',
    keywords: ['queue', 'prompt'],
  },
  'session.new': {
    id: 'session.new',
    label: 'Start Session',
    icon: 'new-session',
    description:
      'Start a Session with an Agent, Checkout and optional first prompt. A Session may pass the `starter` Checkout to run the new Session in its own working tree, uncommitted changes included. A worktree Checkout can name its branch. If that branch is held by a clean unowned linked worktree, the conflict reports its path and offers a retry with checkout.takenBranch.',
    params: SessionNewInput,
    result: SessionNewOutput,
    tier: 'act',
    keywords: ['create', 'delegate', 'agent', 'parallel', 'subagent'],
  },
  'session.prompt': {
    id: 'session.prompt',
    label: 'Prompt Session',
    icon: 'message',
    description: 'Send a prompt to a Session to start its next Turn.',
    params: SessionPromptInput,
    result: SessionPromptOutput,
    tier: 'act',
    keywords: ['message', 'steer', 'continue', 'agent'],
  },
  'session.cancel': {
    id: 'session.cancel',
    label: 'Cancel Session',
    icon: 'close',
    description: 'Cancel the selected Session’s running Turn.',
    params: SessionCancelInput,
    result: SessionCancelOutput,
    tier: 'act',
    keywords: ['stop', 'interrupt', 'turn'],
  },
  'session.archive': {
    id: 'session.archive',
    label: 'Archive Session',
    icon: 'archive',
    description:
      'Archive a Session and remove its Checkout after the Undo window. When the user asks an Agent to archive its own Session, schedule it for when the Session is idle without another confirmation.',
    params: SessionArchiveInput,
    result: SessionArchiveOutput,
    tier: 'act',
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
    tier: 'confirm',
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
    keywords: ['model', 'mode', 'effort', 'configuration'],
  },
  'session.close': {
    id: 'session.close',
    label: 'Close Session',
    icon: 'close',
    description:
      'Close the live Agent Session while keeping its Feed and Checkout for later.',
    params: SessionCloseInput,
    result: SessionCloseOutput,
    tier: 'act',
    keywords: ['close', 'release'],
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
    params: SessionRenameInput,
    result: SessionRenameOutput,
    tier: 'act',
    keywords: ['title', 'name'],
  },
} as const satisfies Record<string, OperationDefinition>;
