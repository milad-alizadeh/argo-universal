import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-types.ts';

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

const shellScenario = (step: ScriptedStep): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [step],
});

export const shellScenarios = {
  'shell-running': shellScenario(runningShellStep),
  'shell-exited': shellScenario(exitedShellStep),
  'shell-stopped': shellScenario(stoppedShellStep),
} satisfies Record<string, ScriptedScenario>;
