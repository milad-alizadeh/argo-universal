import {
  SessionStopShellInput,
  SessionStopShellOutput,
} from '../sessions/shells';
import type { OperationDefinition } from './index';

export const shellOperations = {
  'shell.stop': {
    id: 'shell.stop',
    label: 'Stop Shell',
    icon: 'terminal',
    description: 'Stop a running Shell that belongs to the selected Session.',
    params: SessionStopShellInput,
    result: SessionStopShellOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['terminal', 'command', 'kill'],
  },
} as const satisfies Record<string, OperationDefinition>;
