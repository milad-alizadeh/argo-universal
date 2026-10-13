import { expect, within } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  dateFormatsRequest,
  dateFormatsValues,
  emptyAnswersRequest,
} from '../request.mocks';

const meta = { ...elicitationTestMeta, title: 'Tests/ElicitationForm' };

export default meta;

function emptyAnswers(width: number): Story {
  return {
    args: { request: emptyAnswersRequest },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: /^Choice/ }));
      await userEvent.click(
        await within(document.body).findByRole('option', { name: 'None' }),
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { options: [], choice: '', 'detail.name': 'release' },
      });
    },
  };
}

export const EmptyAnswersPhone = emptyAnswers(390);

export const EmptyAnswersWide = emptyAnswers(1440);

function dateFormats(width: number): Story {
  return {
    args: { request: dateFormatsRequest, initialValues: dateFormatsValues },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.getByText('Enter a valid date.')).toBeVisible();
      await expect(
        canvas.getByText('Enter a valid date and time.'),
      ).toBeVisible();
      const date = canvas.getByRole('textbox', { name: /^Date$/ });
      await userEvent.clear(date);
      await userEvent.type(date, '2024-02-29T12:00:00Z');
      await expect(canvas.getByText('Enter a valid date.')).toBeVisible();
      await userEvent.clear(date);
      await userEvent.type(date, '2024-02-29');
      const time = canvas.getByRole('textbox', { name: 'Date and time' });
      await userEvent.clear(time);
      await userEvent.type(time, '2026-10-06T12:30:00+01:00');
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { date: '2024-02-29', time: '2026-10-06T12:30:00+01:00' },
      });
    },
  };
}

export const DateFormatsPhone = dateFormats(390);

export const DateFormatsWide = dateFormats(1440);
