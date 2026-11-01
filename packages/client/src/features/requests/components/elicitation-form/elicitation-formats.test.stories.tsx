import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fireEvent } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import {
  dateFormatsRequest,
  dateFormatsValues,
  emptyAnswersRequest,
} from '../request.mocks';

const meta = {
  ...elicitationTestMeta,
  title: 'Tests/Requests/ElicitationForm/Formats',
};

export default meta;

function emptyAnswers(width: number): Story {
  return {
    args: { request: emptyAnswersRequest },
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await userEvent.click(canvas.getByRole('radio', { name: /^None/ }));
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
      await settleLayout(width);
      await expect(canvas.getByText(/Enter a valid date\./)).toBeVisible();
      await expect(
        canvas.getByText(/Enter a valid date and time\./),
      ).toBeVisible();
      // The browser's own inputs take only whole dates, so a valid pick clears the message.
      const date = canvas.getByLabelText('Date *');
      await fireEvent.change(date, { target: { value: '2024-02-29' } });
      await expect(canvas.queryByText(/Enter a valid date\./)).toBeNull();
      const time = canvas.getByLabelText('Date and time *');
      await fireEvent.change(time, { target: { value: '2026-10-06T12:30' } });
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          date: '2024-02-29',
          time: expect.stringMatching(/^2026-10-0[5-7]T/),
        },
      });
    },
  };
}

export const DateFormatsPhone = dateFormats(390);

export const DateFormatsWide = dateFormats(1440);
