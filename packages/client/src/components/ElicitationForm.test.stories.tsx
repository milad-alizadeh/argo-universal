import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import {
  ElicitationFormPreview,
  fieldsRequest,
  fieldsValues,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';

const meta = {
  title: 'Tests/ElicitationForm',
  component: ElicitationFormPreview,
  parameters: { previewPadding: false },
  args: { onAnswer: fn() },
} satisfies Meta<typeof ElicitationFormPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

function choice(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('button', { name: 'Submit' }),
      ).toBeDisabled();
      await userEvent.click(canvas.getByRole('button', { name: /^Color/ }));
      await userEvent.click(
        await within(document.body).findByRole('option', { name: 'Blue' }),
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { 'Which color do you prefer?': 'Blue' },
      });
      await expect(canvas.getByText('You answered')).toBeVisible();
      await expect(canvas.getByText('Blue', { exact: true })).toBeVisible();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    },
  };
}
export const ChoicePhone = choice(390);
export const ChoiceWide = choice(1440);

function validation(width: number): Story {
  return {
    args: { request: fieldsRequest, values: fieldsValues, source: 'linear' },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(
        canvas.getByText('Enter a whole number from 1 to 8.'),
      ).toBeVisible();
      await expect(canvas.getByText('Fix Estimate to submit')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Submit' }),
      ).toBeDisabled();
      const estimate = canvas.getByRole('textbox', { name: 'Estimate' });
      await userEvent.clear(estimate);
      await userEvent.type(estimate, '3.5');
      await expect(canvas.getByText('Enter a whole number.')).toBeVisible();
      await userEvent.clear(estimate);
      await userEvent.type(estimate, '8');
      await userEvent.click(
        canvas.getByRole('checkbox', { name: 'Notify the team' }),
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          title: 'Drafts vanish after a reconnect',
          team: 'Mobile',
          estimate: 8,
          notify: false,
        },
      });
      await expect(canvas.getByText('You answered')).toBeVisible();
      await expect(canvas.getByText('No', { exact: true })).toBeVisible();
    },
  };
}
export const FieldsPhone = validation(390);
export const FieldsWide = validation(1440);

export const SubmitWithEnter: Story = {
  args: { request: fieldsRequest, values: { ...fieldsValues, estimate: '5' } },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('textbox', { name: 'Title' }));
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(canvas.getByText('You answered')).toBeVisible();
  },
};

function dismiss(width: number, action: 'cancel' | 'decline'): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', {
          name: action === 'cancel' ? 'Dismiss' : 'Decline',
        }),
      );
      await expect(args.onAnswer).toHaveBeenCalledWith({ action });
      await expect(
        canvas.getByText(
          action === 'cancel' ? 'You dismissed' : 'You declined',
        ),
      ).toBeVisible();
    },
  };
}
export const DismissPhone = dismiss(390, 'cancel');
export const DismissWide = dismiss(1440, 'cancel');
export const DeclinePhone = dismiss(390, 'decline');
export const DeclineWide = dismiss(1440, 'decline');

function conflict(width: number): Story {
  return {
    args: { alreadyAnswered: 'Already answered on another device' },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Already answered on another device',
      );
      await expect(
        canvas.getByRole('button', { name: /^Color/ }),
      ).toBeDisabled();
      if (width < 720)
        await expect(
          canvas.queryByRole('button', { name: 'Submit' }),
        ).not.toBeInTheDocument();
      else
        await expect(
          canvas.getByRole('button', { name: 'Submit' }),
        ).toBeDisabled();
    },
  };
}
export const ConflictPhone = conflict(390);
export const ConflictWide = conflict(1440);
