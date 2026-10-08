import type { RequestMock } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import {
  dateFormatsRequest,
  dateFormatsValues,
  ElicitationFormPreview,
  elicitationMock,
  elicitationMocks,
  emptyAnswersRequest,
  fieldsRequest,
  fieldsValues,
  invalidSchemaRequest,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import type { ElicitationValues } from './ElicitationForm';

const meta = {
  title: 'Tests/ElicitationForm',
  component: ElicitationFormPreview,
  parameters: { previewPadding: false },
  args: { onAnswer: fn() },
} satisfies Meta<typeof ElicitationFormPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

function choice(width: number, mock: RequestMock = elicitationMock): Story {
  const answer = mock.answer;
  if (answer.procedure !== 'answerElicitation')
    throw new Error('Recorded catalog needs an Elicitation answer.');
  return {
    args: { mock },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.getByRole('alert')).toHaveTextContent('Fix Color');
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
        content: answer.input.content,
      });
      await expect(canvas.getByText('You answered')).toBeVisible();
      await expect(
        canvas.queryByText('Color preference'),
      ).not.toBeInTheDocument();
      await expect(
        canvas.getByText('Which color do you prefer?'),
      ).toBeVisible();
      await expect(canvas.getByText('Blue', { exact: true })).toBeVisible();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    },
  };
}
export const ChoicePhone = choice(390);
export const ChoiceWide = choice(1440);
export const SecondAgentChoicePhone = choice(390, elicitationMocks[1]);
export const SecondAgentChoiceWide = choice(1440, elicitationMocks[1]);

function submitting(width: number, mock: RequestMock = elicitationMock): Story {
  return {
    args: { mock, state: { kind: 'submitting' }, values: recordedValues(mock) },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const sending = canvas.getByRole('button', { name: 'Sending…' });
      await expect(sending).toBeDisabled();
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
  };
}
export const SubmittingPhone = submitting(390);
export const SubmittingWide = submitting(1440);
export const SecondAgentSubmittingPhone = submitting(390, elicitationMocks[1]);
export const SecondAgentSubmittingWide = submitting(1440, elicitationMocks[1]);

function responseError(
  width: number,
  mock: RequestMock = elicitationMock,
): Story {
  return {
    args: {
      mock,
      error: 'Could not send the answer. Try again.',
      values: recordedValues(mock),
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('alert')).toHaveTextContent(
        'Could not send the answer. Try again.',
      );
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Decline' }),
      ).toBeEnabled();
    },
  };
}
export const ResponseErrorPhone = responseError(390);
export const ResponseErrorWide = responseError(1440);
export const SecondAgentResponseErrorPhone = responseError(
  390,
  elicitationMocks[1],
);
export const SecondAgentResponseErrorWide = responseError(
  1440,
  elicitationMocks[1],
);

function recordedValues(mock: RequestMock): ElicitationValues {
  const answer = mock.answer;
  if (answer.procedure !== 'answerElicitation')
    throw new Error('Recorded catalog needs an Elicitation answer.');
  const content = answer.input.content;
  if (!content || !stringAnswers(content))
    throw new Error(
      'Recorded catalog needs string answers for the color form.',
    );
  return content;
}

function stringAnswers(
  content: Record<string, unknown>,
): content is Record<string, string> {
  return Object.values(content).every((value) => typeof value === 'string');
}

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

function conflict(width: number, mock?: RequestMock): Story {
  return {
    args: {
      mock,
      state: { kind: 'answered', reason: 'Already answered on another device' },
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Already answered on another device',
      );
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
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
export const SecondAgentConflictPhone = conflict(390, elicitationMocks[1]);
export const SecondAgentConflictWide = conflict(1440, elicitationMocks[1]);

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
      await expect(canvas.getByText('None', { exact: true })).toBeVisible();
    },
  };
}
export const EmptyAnswersPhone = emptyAnswers(390);
export const EmptyAnswersWide = emptyAnswers(1440);

function dateFormats(width: number): Story {
  return {
    args: { request: dateFormatsRequest, values: dateFormatsValues },
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
    args: { request: fieldsRequest, values: fieldsValues },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.clear(canvas.getByRole('textbox', { name: 'Estimate' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: {
          title: 'Drafts vanish after a reconnect',
          team: 'Mobile',
          notify: true,
        },
      });
    },
  };
}
export const ClearOptionalNumberPhone = clearOptionalNumber(390);
export const ClearOptionalNumberWide = clearOptionalNumber(1440);
