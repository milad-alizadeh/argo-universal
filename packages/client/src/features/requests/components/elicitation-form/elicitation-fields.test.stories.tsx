import { expect } from 'storybook/test';
import {
  issueTitle,
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  fieldsRequest,
  fieldsValues,
  invalidSchemaRequest,
} from '../request.mocks';

const meta = { ...elicitationTestMeta, title: 'Tests/ElicitationForm' };

export default meta;

function validation(width: number): Story {
  return {
    args: {
      request: fieldsRequest,
      initialValues: fieldsValues,
      source: 'linear',
    },
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
          title: issueTitle,
          team: 'Mobile',
          estimate: 8,
          notify: false,
        },
      });
    },
  };
}

export const FieldsPhone = validation(390);

export const FieldsWide = validation(1440);

export const SubmitWithEnter: Story = {
  args: {
    request: fieldsRequest,
    initialValues: { ...fieldsValues, estimate: '5' },
  },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('textbox', { name: 'Title' }));
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
  },
};

function dismiss(width: number, action: 'cancel' | 'decline'): Story {
  return {
    args: { request: fieldsRequest },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', {
          name: action === 'cancel' ? 'Dismiss' : 'Decline',
        }),
      );
      await expect(args.onAnswer).toHaveBeenCalledWith({ action });
    },
  };
}

export const DismissPhone = dismiss(390, 'cancel');

export const DismissWide = dismiss(1440, 'cancel');

export const DeclinePhone = dismiss(390, 'decline');

export const DeclineWide = dismiss(1440, 'decline');

export const InvalidSchema: Story = {
  args: { request: invalidSchemaRequest },
  play: async ({ canvas, userEvent, args }) => {
    await expect(
      canvas.getByText('The Agent provided an invalid form.'),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
  },
};

function clearOptionalNumber(width: number): Story {
  return {
    args: { request: fieldsRequest, initialValues: fieldsValues },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.clear(canvas.getByRole('textbox', { name: 'Estimate' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          title: issueTitle,
          team: 'Mobile',
          notify: true,
        },
      });
    },
  };
}

export const ClearOptionalNumberPhone = clearOptionalNumber(390);

export const ClearOptionalNumberWide = clearOptionalNumber(1440);
