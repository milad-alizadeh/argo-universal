import type { PendingElicitation, PlanEntry } from '@repo/contracts';
import type { ElicitationValues } from '../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationRequest } from '../src/features/requests/components/request.mocks';

const workQuestion = 'What should we work on next in Argo Universal?';

const buildFeature = 'Build a feature';

const exploreIdea = 'Explore an idea';

const workOptions = [buildFeature, 'Fix a bug', exploreIdea].map((label) => ({
  const: label,
  title: label,
}));

const areas = [
  'The header',
  'The Composer',
  'The Feed',
  'The Workbench',
  'The Inspector',
  'The rail',
  'The Session list',
  'Settings',
  'Plugins',
  'Background Tasks',
  'Subagents',
  'Attachments',
  'Slash commands',
  'Notifications',
  'The phone sheet',
  'Keyboard shortcuts',
];

const choices = (labels: string[]): { const: string; title: string }[] =>
  labels.map((label) => ({ const: label, title: label }));

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
        oneOf: choices(areas.slice(0, 3)),
      },
    },
    required: ['goal', 'work', 'priority'],
  },
};

// The multi-select on its own: one question, headed by the message.
export const nextWorkRequest: PendingElicitation = {
  ...elicitationRequest,
  message: workQuestion,
  requestedSchema: {
    properties: {
      work: { type: 'array', title: 'Work', items: { anyOf: workOptions } },
    },
    required: ['work'],
  },
};

export const nextWorkValues: ElicitationValues = {
  work: [buildFeature, exploreIdea],
};

export const questionsValues: ElicitationValues = {
  goal: buildFeature,
  work: [buildFeature, exploreIdea],
};

// One question with more choices than the Composer's tray shows at once.
export const longQuestionRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'Which part of Argo should I polish next?',
  requestedSchema: {
    properties: {
      area: {
        type: 'string',
        description: 'Which part of Argo should I polish next?',
        oneOf: choices(areas),
      },
    },
    required: ['area'],
  },
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
