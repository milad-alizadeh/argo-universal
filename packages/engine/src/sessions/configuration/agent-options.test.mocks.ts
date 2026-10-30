import { type CloseSessionRequest } from '@agentclientprotocol/sdk';
import {
  type SessionAgentOptionsInput,
  type AgentOptionsUpdate,
  type SessionConfigOption,
} from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { emptySessionInput } from '#mocks/acp-engine';

export async function collectOptions(
  stream: Promise<AsyncIterable<AgentOptionsUpdate>>,
): Promise<SessionConfigOption[]> {
  let result: AgentOptionsUpdate['configOptions'] = null;

  for await (const update of await stream) result = update.configOptions;

  return result ?? [];
}

function optionList(update: AgentOptionsUpdate): SessionConfigOption[] {
  return update.configOptions ?? [];
}

export async function readySessionOptions(
  stream: Promise<AsyncIterable<AgentOptionsUpdate>>,
): Promise<SessionConfigOption[]> {
  for await (const update of await stream)
    if (update.stage === 'ready') return optionList(update);

  throw new Error('Session options ended before becoming ready');
}

export const optionsSessionId = 'options-session';

export const optionsInput = (
  agent = emptySessionInput.agent,
): SessionAgentOptionsInput => ({
  projectId: emptySessionInput.projectId,
  agent,
});

export const optionsScenario = (
  closes: CloseSessionRequest[],
  opening: NonNullable<
    NonNullable<ScriptedScenario['responses']>['session/new']
  >[number] = {},
): ScriptedScenario => ({
  steps: [],
  responses: {
    'session/new': [
      {
        result: {
          sessionId: optionsSessionId,
          configOptions: acpConfiguration,
        },
        ...opening,
      },
    ],
    'session/close': [{ requests: closes }],
  },
});
