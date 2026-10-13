import type { PendingElicitation } from '@repo/contracts';
import type { ElicitationValues } from '../../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationRequest } from './recorded-requests';

export const fieldsRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'A few details for the new issue',
  requestedSchema: {
    properties: {
      title: { type: 'string', title: 'Title', minLength: 1 },
      team: { type: 'string', title: 'Team', enum: ['Mobile', 'Desktop'] },
      estimate: { type: 'integer', title: 'Estimate', minimum: 1, maximum: 8 },
      notify: {
        type: 'boolean',
        title: 'Notify the team',
        description: "Posts the issue to the team's channel.",
      },
    },
    required: ['title'],
  },
};

export const fieldsValues: ElicitationValues = {
  title: 'Drafts vanish after a reconnect',
  team: 'Mobile',
  estimate: '12',
  notify: true,
};

export const emptyAnswersRequest: PendingElicitation = {
  ...fieldsRequest,
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
  ...fieldsRequest,
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
  ...fieldsRequest,
  requestedSchema: {
    properties: { value: { type: 'string', title: 'Value', pattern: '[' } },
  },
};
