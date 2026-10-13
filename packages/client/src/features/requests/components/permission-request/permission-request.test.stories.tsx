import type { RequestMock } from '@repo/mocks/app';
import { expect, fn, within } from 'storybook/test';
import {
  allow,
  denial,
  denyWithoutMessage,
  responseError,
  submitting,
} from '../../../../../mocks/requests/permission/answer-flows.test.mocks';
import {
  allowOnceLabel,
  meta as permissionTestMeta,
  type Story,
} from '../../../../../mocks/requests/permission/permission-story-context.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { permissionProps, permissionMocks } from '../request.mocks';

const meta = { ...permissionTestMeta, title: 'Tests/PermissionRequest' };
export default meta;

export const DenyPhone = denial(390);
export const DenyWide = denial(1440);

export const AllowPhone = allow(390);
export const AllowWide = allow(1440);
export const SecondAgentAllowPhone = allow(390, permissionMocks[1]);
export const SecondAgentAllowWide = allow(1440, permissionMocks[1]);

export const SubmittingPhone = submitting(390);
export const SubmittingWide = submitting(1440);
export const SecondAgentSubmittingPhone = submitting(390, permissionMocks[1]);
export const SecondAgentSubmittingWide = submitting(1440, permissionMocks[1]);

export const ResponseErrorPhone = responseError(390);
export const ResponseErrorWide = responseError(1440);
export const SecondAgentResponseErrorPhone = responseError(
  390,
  permissionMocks[1],
);
export const SecondAgentResponseErrorWide = responseError(
  1440,
  permissionMocks[1],
);

export const DenyWithoutMessagePhone = denyWithoutMessage(390);
export const DenyWithoutMessageWide = denyWithoutMessage(1440);

export const Keyboard: Story = {
  args: { feedback: true, denialMessage: 'Use a new branch.' },
  play: async ({ userEvent, args }) => {
    const canvas = within(document.body);
    await settleViewport(1440);
    await expect(canvas.getByRole('textbox')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onDenialMessageChange).toHaveBeenCalledWith(undefined);
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'reject_once',
      message: 'Use a new branch.',
    });
  },
};

export const OpensDenial: Story = {
  args: { feedback: true },
  play: async ({ userEvent, args }) => {
    const canvas = within(document.body);
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
    await expect(args.onDenialMessageChange).toHaveBeenCalledWith('');
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

function conflict(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...permissionProps({ mock, onAnswer: fn(), onDenialMessageChange: fn() }),
      state: { kind: 'answered', reason: 'Already answered on another device' },
    },
    play: async ({ args }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Already answered on another device',
      );
      const allowOnce = canvas.queryByRole('button', { name: allowOnceLabel });
      await (width < 720
        ? expect(allowOnce).not.toBeInTheDocument()
        : expect(allowOnce).toBeDisabled());
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
  };
}
export const ConflictPhone = conflict(390);
export const ConflictWide = conflict(1440);
export const SecondAgentConflictPhone = conflict(390, permissionMocks[1]);
export const SecondAgentConflictWide = conflict(1440, permissionMocks[1]);
