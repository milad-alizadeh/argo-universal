import {
  SessionClearInput,
  SessionClearOutput,
  SessionReloadInput,
  SessionReloadOutput,
} from '../sessions/restart';
import type { OperationDefinition } from './index';

// The Operations behind Argo's own Slash commands, `/reload` and `/clear`.
export const sessionRestartOperations = {
  'session.reload': {
    id: 'session.reload',
    label: 'Reload Agent',
    description:
      'Close an idle Session’s Agent session and open the same one again, so its Agent process restarts and reads new skills, extensions and settings. The Agent keeps the conversation.',
    params: SessionReloadInput,
    result: SessionReloadOutput,
    tier: 'act',
    keywords: ['restart', 'refresh', 'skills', 'extensions'],
  },
  'session.clear': {
    id: 'session.clear',
    label: 'Clear context',
    description:
      'Give an idle Session a new Agent session with an empty context. The Feed and Checkout stay; the Agent forgets the conversation.',
    params: SessionClearInput,
    result: SessionClearOutput,
    tier: 'confirm',
    keywords: ['reset', 'context', 'forget', 'new'],
  },
} as const satisfies Record<string, OperationDefinition>;
