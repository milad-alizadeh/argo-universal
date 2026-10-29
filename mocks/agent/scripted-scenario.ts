import {
  type InitializeResponse,
  type PromptResponse,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';

export type {
  ScriptedCredentials,
  ScriptedStep,
  ScriptedScenario,
  ScriptedTurn,
} from './scripted-types.ts';

export const scriptedInitialization: InitializeResponse = {
  protocolVersion: 1,
  agentCapabilities: {
    promptCapabilities: { image: true },
    loadSession: true,
    sessionCapabilities: { close: {}, resume: {} },
  },
};

import { runStep } from './scripted-steps.ts';

export const runTurn = async (
  steps: readonly ScriptedStep[],
  turn: ScriptedTurn,
): Promise<PromptResponse> => {
  for (const step of steps) {
    await runStep(step, turn);
  }

  return { stopReason: turn.isCancelled() ? 'cancelled' : 'end_turn' };
};

// An Agent sends some updates only after a response has gone out, as with a Session's Slash commands.
export const runAfterResponse = (
  steps: readonly ScriptedStep[] | undefined,
  turn: ScriptedTurn,
): void => {
  if (steps)
    setImmediate(() => {
      void runTurn(steps, turn).catch(() => {});
    });
};
