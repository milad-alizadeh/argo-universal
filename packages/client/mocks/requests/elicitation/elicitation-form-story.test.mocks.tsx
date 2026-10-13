import type { RequestMock } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import {
  ElicitationForm,
  type ElicitationAnswer,
  type ElicitationValues,
} from '../../../src/features/requests/components/elicitation-form/elicitation-form';
import { elicitationProps } from '../../../src/features/requests/components/request.mocks';
import { RequestFrame } from '../../../src/lib/product/request-frame';

export const issueTitle = 'Drafts vanish after a reconnect';

export const meta: Meta<typeof ElicitationForm> = {
  component: ElicitationForm,
  parameters: { previewPadding: false },
  render: (args) => (
    <RequestFrame>
      <ElicitationForm {...elicitationProps(args)} />
    </RequestFrame>
  ),
  args: { ...elicitationProps({}), onAnswer: fn() },
};

export type Story = StoryObj<typeof meta>;

export function recordedAnswer(mock: RequestMock): ElicitationAnswer {
  const answer = mock.answer;

  if (answer.procedure !== 'answerElicitation')
    throw new Error('Recorded catalog needs an Elicitation answer.');

  return answer.input;
}

const stringAnswersNeeded =
  'Recorded catalog needs string answers for the color form.';

export function recordedValues(mock: RequestMock): ElicitationValues {
  const content = recordedAnswer(mock).content;

  if (!content) throw new Error(stringAnswersNeeded);
  const answers = Object.entries(content);

  if (!answers.every(isStringAnswer)) throw new Error(stringAnswersNeeded);

  return Object.fromEntries(answers);
}

const isStringAnswer = (
  answer: [string, unknown],
): answer is [string, string] => typeof answer[1] === 'string';
