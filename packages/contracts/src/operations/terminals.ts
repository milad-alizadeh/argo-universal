import {
  TerminalReadParams,
  TerminalReadResult,
  TerminalSendParams,
  TerminalSendResult,
} from '../runs/terminal';
import type { OperationDefinition } from './index';

export const terminalOperations = {
  'terminal.read': {
    id: 'terminal.read',
    label: 'Read Terminal',
    icon: 'terminal',
    description:
      'Read the screen a Run shows now, with the lines scrolled above it.',
    params: TerminalReadParams,
    result: TerminalReadResult,
    tier: 'read',
    policy: 'allow',
    keywords: ['screen', 'scrollback', 'output', 'prompt', 'run'],
  },
  'terminal.send': {
    id: 'terminal.send',
    label: 'Type into Terminal',
    icon: 'terminal',
    description:
      'Type keystrokes into a Run, such as r to reload Expo. Never into a Terminal the person opened.',
    params: TerminalSendParams,
    result: TerminalSendResult,
    tier: 'act',
    policy: 'allow',
    keywords: ['keys', 'press', 'input', 'type', 'reload', 'run'],
  },
} as const satisfies Record<string, OperationDefinition>;
