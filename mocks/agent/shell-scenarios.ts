import type { ScriptedStep } from './scripted-types.ts';

// These commands run only when #89 supplies the real Server terminal service.
export const runningShellStep = {
  type: 'terminal',
  toolCallId: 'background-command',
  request: {
    command: 'node',
    args: ['-e', "console.log('ready'); setInterval(() => {}, 1000)"],
  },
  completion: 'leave-running',
} satisfies ScriptedStep;

export const exitedShellStep = {
  type: 'terminal',
  toolCallId: 'finite-command',
  request: {
    command: 'node',
    args: ['-e', "console.log('done'); process.exit(7)"],
  },
  completion: 'wait-for-exit',
} satisfies ScriptedStep;

export const stoppedShellStep = {
  ...runningShellStep,
  completion: 'kill',
} satisfies ScriptedStep;
