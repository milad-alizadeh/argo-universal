import { SessionCloseInput, SessionCloseOutput } from '../sessions/close';
import { SessionRenameInput, SessionRenameOutput } from '../sessions/rename';
import {
  SessionSavePlanInput,
  SessionSavePlanOutput,
} from '../sessions/save-plan';
import {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '../sessions/set-config-option';
import {
  SessionStopShellInput,
  SessionStopShellOutput,
} from '../sessions/shells';
import type { OperationDefinition } from './index';

export const sessionOperations = {
  'shell.stop': {
    id: 'shell.stop',
    label: 'Stop Shell',
    description: 'Stop a running Shell that belongs to the selected Session.',
    params: SessionStopShellInput,
    result: SessionStopShellOutput,
    tier: 'act',
    keywords: ['terminal', 'command', 'kill'],
  },
  'session.setConfigOption': {
    id: 'session.setConfigOption',
    label: 'Set Session option',
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
    description:
      'Close the live Agent Session while keeping its Feed and Checkout for later.',
    params: SessionCloseInput,
    result: SessionCloseOutput,
    tier: 'act',
    keywords: ['close', 'release'],
  },
  'session.savePlan': {
    id: 'session.savePlan',
    label: 'Save plan',
    description:
      'Save a Markdown plan to a new file under .argo/plans in the Session Checkout.',
    params: SessionSavePlanInput,
    result: SessionSavePlanOutput,
    tier: 'act',
    keywords: ['plan', 'markdown', 'file'],
  },
  'session.rename': {
    id: 'session.rename',
    label: 'Rename Session',
    description:
      'Set the title shown for a Session in the Sessions list and Feed.',
    params: SessionRenameInput,
    result: SessionRenameOutput,
    tier: 'act',
    keywords: ['title', 'name'],
  },
} as const satisfies Record<string, OperationDefinition>;
