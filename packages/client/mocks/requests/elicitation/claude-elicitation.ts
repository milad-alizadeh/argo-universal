import type { PendingElicitation } from '@repo/contracts';
import { elicitationRequest } from '../recorded-requests';

/*
 * Claude ACP v0.97.0 src/elicitation.ts: question_N and question_N_custom are companions.
 * https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.97.0/src/elicitation.ts
 */
export const claudeQuestionsRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Please answer the following questions.',
  requestedSchema: {
    type: 'object',
    properties: {
      question_0: {
        type: 'string',
        title: 'Work',
        description: 'What should we work on?',
        oneOf: [
          { const: 'Build', title: 'Build' },
          { const: 'Fix', title: 'Fix' },
        ],
      },
      question_0_custom: {
        type: 'string',
        title: 'Other',
        description: 'Add an answer or a note (optional).',
      },
      question_1: {
        type: 'array',
        title: 'Areas',
        description: 'Which areas should we change?',
        items: {
          anyOf: [
            { const: 'Server', title: 'Server' },
            { const: 'App', title: 'App' },
          ],
        },
      },
      question_1_custom: {
        type: 'string',
        title: 'Other',
        description: 'Add another area (optional).',
      },
    },
  },
};

export const claudeQuestionsValues = {
  question_0: 'Build',
  question_0_custom: 'Keep it small.',
  question_1: ['Server'],
  question_1_custom: 'Start with requests.',
};
