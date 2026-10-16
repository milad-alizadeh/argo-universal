import type { PendingElicitation } from '@repo/contracts';
import type { ElicitationValues } from '../../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationRequest } from './recorded-requests';

// One choice with a description for each option: a single question, headed by the message.
export const refactorRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'How would you like me to approach this refactoring?',
  requestedSchema: {
    properties: {
      approach: {
        type: 'string',
        title: 'Approach',
        oneOf: [
          {
            const: 'conservative',
            title: 'Conservative',
            description: 'Minimal changes, keep the existing structure.',
          },
          {
            const: 'balanced',
            title: 'Balanced (Recommended)',
            description: 'Improve the structure while keeping the public API.',
          },
          {
            const: 'aggressive',
            title: 'Aggressive',
            description: 'Rewrite freely, breaking changes allowed.',
          },
        ],
      },
    },
    required: ['approach'],
  },
};

// One string: the message asks for it, so its row draws no label.
export const functionNameRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'What should this function be named?',
  requestedSchema: {
    properties: {
      name: { type: 'string', title: 'Function name', default: 'processData' },
    },
    required: ['name'],
  },
};

export const configurationRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Please provide configuration details.',
  requestedSchema: {
    properties: {
      name: { type: 'string', title: 'Name', minLength: 1 },
      port: {
        type: 'integer',
        title: 'Port',
        minimum: 1024,
        maximum: 65535,
        default: 3000,
      },
      enableLogging: {
        type: 'boolean',
        title: 'Enable logging',
        default: true,
      },
    },
    required: ['name'],
  },
};

export const configurationValues: ElicitationValues = {
  name: 'argo-server',
  port: '80',
};

export const emptyAnswersRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Which options apply?',
  requestedSchema: {
    properties: {
      options: {
        type: 'array',
        title: 'Options',
        minItems: 0,
        default: [],
        items: { type: 'string', enum: ['One'] },
      },
      choice: {
        type: 'string',
        title: 'Choice',
        oneOf: [
          { const: '', title: 'None' },
          { const: 'Blue', title: 'Blue' },
        ],
      },
      optional: { type: 'string', title: 'Optional' },
      'detail.name': { type: 'string', title: 'Detail', default: 'release' },
    },
    required: ['options', 'choice'],
  },
};

export const dateFormatsRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'When should the release go out?',
  requestedSchema: {
    properties: {
      date: { type: 'string', title: 'Date', format: 'date' },
      time: { type: 'string', title: 'Date and time', format: 'date-time' },
    },
    required: ['date', 'time'],
  },
};

export const dateFormatsValues: ElicitationValues = {
  date: '2026-02-30',
  time: '2026-10-06',
};

export const invalidSchemaRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Please provide a value.',
  requestedSchema: {
    properties: { value: { type: 'string', title: 'Value', pattern: '[' } },
  },
};
