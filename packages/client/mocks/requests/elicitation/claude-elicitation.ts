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

// Two Claude questions whose options each say what choosing them does, as AskUserQuestion sends them.
export const claudeDescribedRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Please answer the following questions.',
  requestedSchema: {
    type: 'object',
    properties: {
      question_0: {
        type: 'string',
        title: 'Waiting',
        description:
          "'Waiting for approval' still shows as soon as the connection opens, because the Server sends nothing until you click Allow. Should the Server send an early 'request received' message so the phone switches to waiting only when the prompt is really on the Mac?",
        oneOf: [
          {
            const: 'early',
            title: 'Add the early message (Recommended)',
            description:
              'A small change to the wire protocol, written into ADR-0045 and done in this PR. The phone knows exactly when the prompt is up.',
          },
          {
            const: 'keep',
            title: 'Keep it as it is',
            description:
              "Show waiting once connected. It's honest enough, since a connection that works almost always reaches the prompt.",
          },
        ],
      },
      question_0_custom: {
        type: 'string',
        title: 'Other',
        description: 'Add an answer or a note (optional).',
      },
    },
  },
};
