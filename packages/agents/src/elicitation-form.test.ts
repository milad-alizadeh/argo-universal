import { expect, it } from 'vitest';
import { toElicitationRequest } from './elicitation-form';

const questionText = 'Choose colours';
const questions = [
  {
    id: 'colour',
    title: 'Colour',
    question: questionText,
    multiple: true,
    options: [{ label: 'Red', description: 'Warm' }, { label: 'Blue' }],
  },
];
it('returns the whole multiple-choice elicitation event', (): void => {
  expect(toElicitationRequest('tool', questions)).toEqual({
    type: 'agent.elicitationRequested',
    request: {
      toolCallId: 'tool',
      mode: 'form',
      message: questionText,
      requestedSchema: {
        type: 'object',
        required: ['colour'],
        properties: {
          colour: {
            type: 'array',
            title: 'Colour',
            description: questionText,
            items: {
              anyOf: [
                { const: 'Red', title: 'Red', description: 'Warm' },
                { const: 'Blue', title: 'Blue' },
              ],
            },
          },
        },
      },
    },
  });
});
it.each(['id', 'title', 'question'])(
  'rejects a malformed %s at the Argo boundary',
  (field): void => {
    expect(() =>
      toElicitationRequest(
        'tool',
        questions.map((question) => ({ ...question, [field]: 17 })),
      ),
    ).toThrow(/Invalid input/);
  },
);
it('rejects a malformed choice at the Argo boundary', (): void => {
  expect(() =>
    toElicitationRequest('tool', [
      {
        ...questions[0],
        id: 'colour',
        title: 'Colour',
        question: questionText,
        options: [{ label: 17 }],
      },
    ]),
  ).toThrow(/Invalid input/);
});
