import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, within } from 'storybook/test';
import {
  questionsRequest,
  boundedChoicesRequest,
} from '../../../../../mocks/elicitation-questions';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { elicitationProps } from '../request.mocks';
import { ElicitationForm } from './elicitation-form';
import { ElicitationSheet } from './elicitation-sheet';

const meta = {
  title: 'Tests/ElicitationQuestions',
  component: ElicitationForm,
  args: { ...elicitationProps({ request: questionsRequest }), onAnswer: fn() },
  render: (args): ReactElement => (
    <RequestFrame>
      <ElicitationForm {...args} />
    </RequestFrame>
  ),
} satisfies Meta<typeof ElicitationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
const buildFeature = 'Build a feature';
const previousQuestion = 'Previous question';
const nextQuestion = 'Next question';
const fixBug = 'Fix a bug';
const exploreIdea = 'Explore an idea';
const customAnswer = 'Custom answer';
const releaseReview = 'Review the release';

function answers(width: number): Story {
  return {
    beforeEach: async (): Promise<void> => {
      await settleViewport(width);
    },
    play: async ({ canvas, userEvent, args }) => {
      await expect(
        canvas.getByRole('button', { name: previousQuestion }),
      ).toBeDisabled();
      await userEvent.click(canvas.getByRole('radio', { name: buildFeature }));
      await userEvent.click(canvas.getByRole('radio', { name: fixBug }));
      await expect(
        canvas.getByRole('radio', { name: buildFeature }),
      ).not.toBeChecked();
      await userEvent.click(canvas.getByRole('button', { name: /^Next$/ }));
      await userEvent.click(
        canvas.getByRole('checkbox', { name: buildFeature }),
      );
      await userEvent.click(
        canvas.getByRole('checkbox', { name: exploreIdea }),
      );
      await userEvent.type(
        canvas.getByRole('textbox', { name: customAnswer }),
        releaseReview,
      );
      await userEvent.click(
        canvas.getByRole('button', { name: previousQuestion }),
      );
      await expect(canvas.getByRole('radio', { name: fixBug })).toBeChecked();
      await userEvent.click(canvas.getByRole('button', { name: nextQuestion }));
      await expect(
        canvas.getByRole('textbox', { name: customAnswer }),
      ).toHaveValue(releaseReview);
      await expect(
        canvas.getByRole('checkbox', { name: buildFeature }),
      ).toBeChecked();
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

export const RetainAnswersAcrossSheetTransition: Story = {
  render: (args): ReactElement => (
    <RequestFrame>
      <ElicitationSheet {...args} />
    </RequestFrame>
  ),
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: customAnswer }),
      'Keep my answer',
    );
    await userEvent.click(canvas.getByRole('button', { name: nextQuestion }));
    await userEvent.click(canvas.getByRole('checkbox', { name: buildFeature }));
    await settleViewport(390);
    const sheet = within(await within(document.body).findByRole('dialog'));
    await expect(
      sheet.getByRole('checkbox', { name: buildFeature }),
    ).toBeChecked();
    await userEvent.click(
      sheet.getByRole('button', { name: previousQuestion }),
    );
    await expect(
      sheet.getByRole('textbox', { name: customAnswer }),
    ).toHaveValue('Keep my answer');
  },
};

export const KeyboardSelection: Story = {
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('radio', { name: buildFeature }));
    canvas.getByRole('radio', { name: fixBug }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('radio', { name: fixBug })).toBeChecked();
    await expect(
      canvas.queryByRole('checkbox', { name: buildFeature }),
    ).not.toBeInTheDocument();
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
    await userEvent.click(canvas.getByRole('checkbox', { name: buildFeature }));
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('checkbox', { name: fixBug }));
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeDisabled();
  },
};
