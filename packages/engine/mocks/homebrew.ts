import type { InstallPorts, InstallToolInput } from '../src/agents';
import { installationPorts } from './installation';
import { createMachinePath, type MachinePath } from './machine-path';

export type Omitted = 'node' | 'npm' | 'uv' | 'brew';

// Puts every tool on PATH except the omitted one; Node.js itself comes from the test PATH unless omitted.
export const machineWithout = async (
  omitted?: Omitted,
): Promise<MachinePath> => {
  const machine = await createMachinePath({ node: omitted !== 'node' });

  for (const tool of ['npm', 'uv', 'brew'] as const)
    if (tool !== omitted) await machine.place(tool);

  return machine;
};

export type HomebrewPorts = InstallPorts & { runs: InstallToolInput[] };

// Homebrew is the external installer: only its port is replaced, and the outcome says what `brew install` does.
export const homebrewPorts = (
  outcome: (input: InstallToolInput) => Promise<void>,
): HomebrewPorts => {
  const runs: InstallToolInput[] = [];

  return {
    ...installationPorts,
    runs,
    runTool: async (input) => {
      runs.push(input);
      await outcome(input);

      return '';
    },
  };
};
