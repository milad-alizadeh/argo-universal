import { fileURLToPath } from 'node:url';
import type { ScenarioName } from './scenarios.ts';

const entry = fileURLToPath(
  new URL('./scripted-agent-process.ts', import.meta.url),
);

type ScriptedAgentCommand = { executable: string; args: string[] };

// The command that runs the scripted Agent as a real stdio process; Node strips the types itself.
export const scriptedAgentCommand = (
  scenario: ScenarioName,
): ScriptedAgentCommand => ({
  executable: process.execPath,
  args: [entry, scenario],
});
