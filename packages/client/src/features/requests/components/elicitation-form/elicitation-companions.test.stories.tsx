import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect } from 'storybook/test';
import {
  claudeQuestionsRequest,
  claudeQuestionsValues,
} from '../../../../../mocks/requests/elicitation/claude-elicitation';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';

const meta = {
  ...elicitationTestMeta,
  title: 'Tests/Requests/ElicitationForm/Companions',
  args: {
    ...elicitationTestMeta.args,
    request: claudeQuestionsRequest,
    initialValues: claudeQuestionsValues,
  },
};

export default meta;

function skipLast(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await expect(canvas.getByText('1 of 2', { exact: false })).toBeVisible();
      await expect(canvas.getByRole('textbox', { name: 'Other' })).toHaveValue(
        'Keep it small.',
      );
      await expect(
        canvas.queryByRole('checkbox', { name: /^Server/ }),
      ).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
      await expect(canvas.getByRole('textbox', { name: 'Other' })).toHaveValue(
        'Start with requests.',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          question_0: 'Build',
          question_0_custom: 'Keep it small.',
        },
      });
    },
  };
}

export const SkipLastPhone = skipLast(390);

export const SkipLastWide = skipLast(1440);

export const SkipFirstClearsItsDraft: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: {
        question_1: ['Server'],
        question_1_custom: 'Start with requests.',
      },
    });
  },
};

export const SkipAllQuestions: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: {},
    });
  },
};
