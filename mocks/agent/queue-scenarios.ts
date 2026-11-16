import {
  scriptedInitialization,
  type ScriptedScenario,
  type ScriptedStep,
} from './scripted-scenario.ts';

type QueueScenario =
  | 'queued-turn-fails'
  | 'queued-image-refused'
  | 'queued-steering'
  | 'queued-steering-refused';

export function queueScenarios(
  scenario: (steps: ScriptedStep[]) => ScriptedScenario,
  reply: ScriptedStep,
): Record<QueueScenario, ScriptedScenario> {
  const base = scenario([reply]);

  return {
    'queued-turn-fails': failedQueuedTurn(base),
    'queued-image-refused': refusedQueuedImage(base),
    'queued-steering': steerableQueue(base),
    'queued-steering-refused': refusedSteering(base),
  };
}

function failedQueuedTurn(base: ScriptedScenario): ScriptedScenario {
  return {
    ...base,
    responses: {
      'session/prompt': [
        { steps: [{ type: 'wait-for-release' }] },
        { error: 'Queued work failed' },
        {},
      ],
    },
  };
}

function refusedQueuedImage(base: ScriptedScenario): ScriptedScenario {
  return {
    ...base,
    initialize: textOnlyInitialization(),
    responses: {
      'session/prompt': [{ steps: [{ type: 'wait-for-release' }] }, {}],
    },
  };
}

function textOnlyInitialization(): NonNullable<ScriptedScenario['initialize']> {
  return {
    ...scriptedInitialization,
    agentCapabilities: {
      ...scriptedInitialization.agentCapabilities,
      promptCapabilities: { image: false },
    },
  };
}

function steerableQueue(base: ScriptedScenario): ScriptedScenario {
  return {
    ...failedQueuedTurn(base),
    initialize: {
      ...scriptedInitialization,
      agentInfo: { name: '@agentclientprotocol/codex-acp', version: '2.4.0' },
      _meta: { steering: { supported: true } },
    },
    steering: { result: { outcome: 'injected' } },
  };
}

function refusedSteering(base: ScriptedScenario): ScriptedScenario {
  return {
    ...steerableQueue(base),
    steering: { result: { outcome: 'failed' } },
  };
}
