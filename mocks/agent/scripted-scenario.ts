import {
  type InitializeResponse,
  type PromptResponse,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';

export type {
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
    _meta: { authStatus: {} },
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
