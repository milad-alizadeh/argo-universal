import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-types.ts';

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

export const streamingShellStep = {
  type: 'terminal',
  toolCallId: 'streaming-command',
  request: {
    command: 'node',
    args: [
      '-e',
      "const fs = require('fs'); console.log('α ready'); const timer = setInterval(() => { if (!fs.existsSync(process.env.ARGO_SHELL_GATE)) return; clearInterval(timer); console.error('ω done'); }, 10)",
    ],
  },
  completion: 'leave-running',
} satisfies ScriptedStep;

export const descendantShellStep = {
  ...runningShellStep,
  request: {
    command: 'node',
    args: [
      '-e',
      "const { spawn } = require('child_process'); const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' }); console.log('descendant:' + child.pid); setInterval(() => {}, 1000)",
    ],
  },
} satisfies ScriptedStep;
