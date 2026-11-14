import {
  scriptedInitialization,
  type ScriptedScenario,
  type ScriptedStep,
} from './scripted-scenario.ts';

export function queueScenarios(
  scenario: (steps: ScriptedStep[]) => ScriptedScenario,
  reply: ScriptedStep,
): Record<'queued-turn-fails' | 'queued-image-refused', ScriptedScenario> {
  const base = scenario([reply]);

  return {
    'queued-turn-fails': failedQueuedTurn(base),
    'queued-image-refused': refusedQueuedImage(base),
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
