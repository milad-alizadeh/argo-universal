import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  PermissionFeedPreview,
  PermissionRequestPreview,
  permissionMocks,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';

const meta = {
  title: 'Tests/PermissionRequest',
  component: PermissionRequestPreview,
  parameters: { previewPadding: false },
  args: { onAnswer: fn() },
} satisfies Meta<typeof PermissionRequestPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

function denial(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      const input = canvas.getByRole('textbox', {
        name: 'What should the Agent do instead?',
      });
      await expect(input).toHaveFocus();
      await userEvent.type(input, 'Keep the cache.');
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
        message: 'Keep the cache.',
      });
      await expect(
        canvas.getByText('You denied: “Keep the cache.”'),
      ).toBeVisible();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    },
  };
}
export const DenyPhone = denial(390);
export const DenyWide = denial(1440);

function allow(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Allow once' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'allow_once',
      });
      await expect(canvas.getByText('You allowed this once')).toBeVisible();
    },
  };
}
export const AllowPhone = allow(390);
export const AllowWide = allow(1440);

function denyWithoutMessage(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await expect(
        canvas.getByRole('button', { name: 'Allow once' }),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
      });
      await expect(
        canvas.getByText('You denied', { exact: true }),
      ).toBeVisible();
    },
  };
}
export const DenyWithoutMessagePhone = denyWithoutMessage(390);
export const DenyWithoutMessageWide = denyWithoutMessage(1440);

export const Keyboard: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('textbox')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(
      canvas.queryByRole('textbox', {
        name: 'What should the Agent do instead?',
      }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.type(canvas.getByRole('textbox'), 'Use a new branch.');
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      optionId: 'reject_once',
      message: 'Use a new branch.',
    });
  },
};

function conflict(width: number): Story {
  return {
    args: { alreadyAnswered: 'Already answered on another device' },
    play: async ({ canvas, args }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        'Already answered on another device',
      );
      if (width < 720)
        await expect(
          canvas.queryByRole('button', { name: 'Allow once' }),
        ).not.toBeInTheDocument();
      else
        await expect(
          canvas.getByRole('button', { name: 'Allow once' }),
        ).toBeDisabled();
      await expect(args.onAnswer).not.toHaveBeenCalled();
    },
  };
}
export const ConflictPhone = conflict(390);
export const ConflictWide = conflict(1440);

function permissionFeed(
  width: number,
  recording: number,
  answered: boolean,
): Story {
  const mock = permissionMocks[recording];
  if (!mock) throw new Error('Permission coverage needs both #54 recordings.');
  return {
    render: () => <PermissionFeedPreview mock={mock} answered={answered} />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      if (answered) {
        await expect(canvas.getByText('You allowed this once')).toBeVisible();
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getAllByText('You allowed this once')).toHaveLength(
          1,
        );
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getByText('You allowed this once')).toBeVisible();
      } else {
        const row = mock.pending.rows.find(
          (row) =>
            row.sessionUpdate === 'tool_call_update' &&
            row.toolCallId ===
              mock.pending.snapshot.pendingPermission?.toolCallId,
        );
        if (row?.sessionUpdate !== 'tool_call_update')
          throw new Error('Recording needs the pending Tool call.');
        await expect(
          canvas.getByText('Awaiting approval', { exact: true }),
        ).toBeVisible();
        await expect(
          canvas.getAllByText('Awaiting approval', { exact: true }),
        ).toHaveLength(1);
        await expect(
          canvas.getByRole('button', { name: row.title }),
        ).toBeVisible();
      }
    },
  };
}
export const FirstAgentApprovalPhone = permissionFeed(390, 0, false);
export const FirstAgentApprovalWide = permissionFeed(1440, 0, false);
export const SecondAgentApprovalPhone = permissionFeed(390, 1, false);
export const SecondAgentApprovalWide = permissionFeed(1440, 1, false);
export const FirstAgentOutcomePhone = permissionFeed(390, 0, true);
export const FirstAgentOutcomeWide = permissionFeed(1440, 0, true);
export const SecondAgentOutcomePhone = permissionFeed(390, 1, true);
export const SecondAgentOutcomeWide = permissionFeed(1440, 1, true);
