import {
  ShellTerminal,
  ShellTerminalCloseParams,
  ShellTerminalOpenParams,
} from '../runs/shell-terminal';
import {
  TerminalReadParams,
  TerminalReadResult,
  TerminalResizeParams,
  TerminalResizeResult,
  TerminalSendParams,
  TerminalSendResult,
} from '../runs/terminal';
import type { OperationDefinition } from './index';

export const terminalOperations = {
  'terminal.close': {
    id: 'terminal.close',
    label: 'Close Terminal',
    icon: 'terminal',
    description: 'End a shell Terminal.',
    params: ShellTerminalCloseParams,
    result: TerminalResizeResult,
    tier: 'act',
    policy: 'person-only',
    keywords: ['shell', 'exit'],
  },
  'terminal.open': {
    id: 'terminal.open',
    label: 'New Terminal',
    icon: 'terminal',
    description: 'Open a shell in the Session’s Checkout.',
    params: ShellTerminalOpenParams,
    result: ShellTerminal,
    tier: 'act',
    policy: 'person-only',
    keywords: ['shell', 'create'],
  },
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
  'terminal.resize': {
    id: 'terminal.resize',
    label: 'Resize Terminal',
    icon: 'terminal',
    description: 'Resize a Run Terminal to match its viewport.',
    params: TerminalResizeParams,
    result: TerminalResizeResult,
    tier: 'act',
    policy: 'person-only',
    keywords: ['columns', 'rows', 'viewport'],
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
