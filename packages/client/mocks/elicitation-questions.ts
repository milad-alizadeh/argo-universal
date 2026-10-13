import type { PendingElicitation, PlanEntry } from '@repo/contracts';
import type { ElicitationValues } from '../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationRequest } from '../src/features/requests/components/request.mocks';

const workQuestion = 'What should we work on next in Argo Universal?';

const buildFeature = 'Build a feature';

const workOptions = [buildFeature, 'Fix a bug', 'Explore an idea'].map(
  (label) => ({ const: label, title: label }),
);

export const questionsRequest: PendingElicitation = {
  ...elicitationRequest,
  message: workQuestion,
  requestedSchema: {
    properties: {
      goal: {
        type: 'string',
        description: 'What kind of work should we do?',
        oneOf: workOptions,
      },
      work: {
        type: 'array',
        description: workQuestion,
        items: { anyOf: workOptions },
      },
      priority: {
        type: 'string',
        description: 'Which part should I start with?',
        oneOf: [
          { const: 'The header', title: 'The header' },
          { const: 'The Composer', title: 'The Composer' },
          { const: 'The Feed', title: 'The Feed' },
        ],
      },
    },
    required: ['goal', 'work', 'priority'],
  },
};

export const questionsValues: ElicitationValues = {
  goal: buildFeature,
  work: [buildFeature, 'Explore an idea'],
};

export const questionPlan: PlanEntry[] = [
  {
    content: 'Implement the approved question flow',
    priority: 'high',
    status: 'pending',
  },
];

export const boundedChoicesRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Choose a work type',
  requestedSchema: {
    properties: {
      work: {
        type: 'array',
        title: 'Work types',
        description: 'Choose exactly one work type.',
        minItems: 1,
        maxItems: 1,
        items: { anyOf: workOptions },
      },
    },
    required: ['work'],
  },
};
