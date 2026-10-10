import type { SessionUpdate } from '@agentclientprotocol/sdk';
import type { ScriptedScenario } from './scripted-scenario.ts';

export const feedScenario = (
  updates: readonly SessionUpdate[],
): ScriptedScenario => ({
  steps: updates.map((update) => ({ type: 'update', update })),
});
