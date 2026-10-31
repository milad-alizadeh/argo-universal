import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

// A prompt holding its Turn open until the Client cancels it; every other prompt gets the reply.
export const heldPrompt = 'Hold this Turn until it is stopped';

export const cancellableScenarios = (
  scenario: (steps: ScriptedStep[]) => ScriptedScenario,
  reply: ScriptedStep,
): Record<'reply-or-hold', ScriptedScenario> => ({
  'reply-or-hold': {
    ...scenario([reply]),
    responses: {
      'session/prompt': [
        { prompt: heldPrompt, steps: [{ type: 'wait-for-cancel' }] },
        {},
      ],
    },
  },
});
