import { expect, within } from 'storybook/test';
import { boundedChoicesRequest } from '../../../../../mocks/elicitation-questions';
import {
  buildFeature,
  customAnswer,
  exploreIdea,
  fixBug,
  meta as questionTestMeta,
  nextQuestion,
  previousQuestion,
  releaseReview,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-question-story.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';

const meta = { ...questionTestMeta, title: 'Tests/ElicitationQuestions' };

export default meta;

const pressed = 'aria-pressed';

// Each option is a row button whose name starts with its title.
const option = (scope: ReturnType<typeof within>, title: string): HTMLElement =>
  scope.getByRole('button', { name: new RegExp(`^${title}`) });

function answers(width: number): Story {
  return {
    beforeEach: async (): Promise<void> => {
      await settleViewport(width);
    },
    play: async ({ canvas, userEvent, args }) => {
      await expect(
        canvas.getByRole('button', { name: previousQuestion }),
      ).toBeDisabled();
      await userEvent.click(option(canvas, buildFeature));
      await userEvent.click(option(canvas, fixBug));
      await expect(option(canvas, buildFeature)).toHaveAttribute(
        pressed,
        'false',
      );
      await userEvent.click(canvas.getByRole('button', { name: /^Next$/ }));
      await userEvent.click(option(canvas, buildFeature));
      await userEvent.click(option(canvas, exploreIdea));
      await userEvent.type(
        canvas.getByRole('textbox', { name: customAnswer }),
        releaseReview,
      );
      await userEvent.click(
        canvas.getByRole('button', { name: previousQuestion }),
      );
      await expect(option(canvas, fixBug)).toHaveAttribute(pressed, 'true');
      await userEvent.click(canvas.getByRole('button', { name: nextQuestion }));
      await expect(
        canvas.getByRole('textbox', { name: customAnswer }),
      ).toHaveValue(releaseReview);
      await expect(option(canvas, buildFeature)).toHaveAttribute(
        pressed,
        'true',
      );
      await userEvent.click(canvas.getByRole('button', { name: /^Next$/ }));
      await expect(
        canvas.getByRole('button', { name: nextQuestion }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Submit' }),
      ).toBeVisible();
      await userEvent.type(
        canvas.getByRole('textbox', { name: customAnswer }),
        'Feed',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          goal: fixBug,
          work: [buildFeature, exploreIdea, releaseReview],
          priority: 'Feed',
        },
      });
    },
  };
}

export const AnswersWide = answers(1440);

export const AnswersPhone = answers(390);

export const SkipAnsweredQuestion: Story = {
  args: {
    initialValues: {
      goal: buildFeature,
      work: [fixBug],
      priority: 'Composer',
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await userEvent.click(canvas.getByRole('button', { name: nextQuestion }));
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      action: 'accept',
      content: { work: [fixBug] },
    });
  },
};

export const KeyboardSelection: Story = {
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(option(canvas, buildFeature));
    option(canvas, fixBug).focus();
    await userEvent.keyboard('{Enter}');
    await expect(option(canvas, fixBug)).toHaveAttribute(pressed, 'true');
    await expect(
      canvas.getByText('Choose one · 1 of 3', { exact: false }),
    ).toBeVisible();
    await expect(args.onAnswer).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
  },
};

export const KeepConstrainedFormValidation: Story = {
  args: { request: boundedChoicesRequest },
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole('textbox', { name: customAnswer }),
    ).not.toBeInTheDocument();
    await userEvent.click(option(canvas, buildFeature));
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await userEvent.click(option(canvas, fixBug));
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeDisabled();
  },
};
