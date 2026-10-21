import { settleViewport } from '@repo/kit/settle-viewport';
import type { RequestMock } from '@repo/mocks/app';
import { expect, fn, within } from 'storybook/test';
import { permissionProps } from '../../../src/features/requests/components/request.mocks';
import {
  allowOnceLabel,
  type Story,
} from './permission-story-context.test.mocks';

export function deny(width: number): Story {
  return {
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
      });
    },
  };
}

export function allow(width: number, mock?: RequestMock): Story {
  return {
    args: permissionProps({ mock, onAnswer: fn() }),
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: allowOnceLabel }),
      );
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'allow_once',
      });
    },
  };
}

export function submitting(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...permissionProps({ mock, onAnswer: fn() }),
      state: { kind: 'submitting' },
    },
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
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

export function responseError(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...permissionProps({ mock, onAnswer: fn() }),
      error: 'Could not send the answer. Try again.',
    },
    play: async () => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(canvas.getByRole('alert')).toHaveTextContent(
        'Could not send the answer. Try again.',
      );
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: allowOnceLabel }),
      ).toBeEnabled();
    },
  };
}
