import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';

// The mock Agent asks the person `message` as an Elicitation with one free-text answer.
const question = (message: string): ScriptedStep => ({
  type: 'elicitation',
  request: {
    mode: 'form',
    message,
    requestedSchema: {
      type: 'object',
      properties: { answer: { type: 'string', title: 'Answer' } },
    },
  },
});

export const questionSteps = (message: string | undefined): ScriptedStep[] =>
  message === undefined ? [] : [question(message)];
