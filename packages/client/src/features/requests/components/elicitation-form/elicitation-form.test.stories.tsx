import { wideBreakpoint } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { RequestMock } from '@repo/mocks/app';
import { expect, fn } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  recordedAnswer,
  recordedValues,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import {
  elicitationProps,
  elicitationMock,
  elicitationMocks,
} from '../request.mocks';

const meta = {
  ...elicitationTestMeta,
  title: 'Tests/Requests/ElicitationForm',
};

export default meta;

function choice(width: number, mock: RequestMock = elicitationMock): Story {
  const content = recordedAnswer(mock).content;

  return {
    args: elicitationProps({ mock, onAnswer: fn() }),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('radio', { name: /^Blue/ }));
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content,
      });
    },
  };
}

export const ChoicePhone = choice(390);

export const ChoiceWide = choice(1440);

export const SecondAgentChoicePhone = choice(390, elicitationMocks[1]);

export const SecondAgentChoiceWide = choice(1440, elicitationMocks[1]);

function submitting(width: number, mock: RequestMock = elicitationMock): Story {
  return {
    args: {
      ...elicitationProps({ mock, onAnswer: fn() }),
      state: { kind: 'submitting' },
      initialValues: recordedValues(mock),
    },
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
      ...elicitationProps({ mock, onAnswer: fn() }),
      error: 'Could not send the answer. Try again.',
      initialValues: recordedValues(mock),
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('alert')).toHaveTextContent(
        'Could not send the answer. Try again.',
      );
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Skip' })).toBeEnabled();
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

function conflict(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...elicitationProps({ mock, onAnswer: fn() }),
      state: { kind: 'answered', reason: 'Already answered on another device' },
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Already answered on another device',
      );
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await expect(canvas.getByRole('radio', { name: /^Blue/ })).toBeDisabled();
      await (width < wideBreakpoint()
        ? expect(
            canvas.queryByRole('button', { name: 'Submit' }),
          ).not.toBeInTheDocument()
        : expect(
            canvas.getByRole('button', { name: 'Submit' }),
          ).toBeDisabled());
    },
  };
}

export const ConflictPhone = conflict(390);

export const ConflictWide = conflict(1440);

export const SecondAgentConflictPhone = conflict(390, elicitationMocks[1]);

export const SecondAgentConflictWide = conflict(1440, elicitationMocks[1]);
