import type { RequestMock } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { permissionProps, permissionMocks } from '../../mocks/request-mock';
import {
  PermissionFeedPreview,
  RequestFrame,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { PermissionRequest } from './permission-request';
import galleryMeta, { Overview as Gallery } from './permission-request.stories';

const meta: Meta<typeof PermissionRequest> = {
  title: 'Tests/PermissionRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  render: (args) => (
    <RequestFrame>
      <PermissionRequest {...permissionProps(args)} />
    </RequestFrame>
  ),
  args: { ...permissionProps({}), onAnswer: fn(), onDenialMessageChange: fn() },
};
export default meta;
type Story = StoryObj<typeof meta>;

function denial(width: number): Story {
  return {
    args: { denialMessage: 'Keep the cache.' },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', {
        name: 'What should the Agent do instead?',
      });
      await expect(input).toHaveFocus();
      await expect(input).toHaveValue('Keep the cache.');
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
        message: 'Keep the cache.',
      });
    },
  };
}
export const DenyPhone = denial(390);
export const DenyWide = denial(1440);

function allow(width: number, mock?: RequestMock): Story {
  return {
    args: permissionProps({
      mock,
      onAnswer: fn(),
      onDenialMessageChange: fn(),
    }),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Allow once' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'allow_once',
      });
    },
  };
}
export const AllowPhone = allow(390);
export const AllowWide = allow(1440);
export const SecondAgentAllowPhone = allow(390, permissionMocks[1]);
export const SecondAgentAllowWide = allow(1440, permissionMocks[1]);

function submitting(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...permissionProps({ mock, onAnswer: fn(), onDenialMessageChange: fn() }),
      state: { kind: 'submitting' },
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
export const SecondAgentSubmittingPhone = submitting(390, permissionMocks[1]);
export const SecondAgentSubmittingWide = submitting(1440, permissionMocks[1]);

function responseError(width: number, mock?: RequestMock): Story {
  return {
    args: {
      ...permissionProps({ mock, onAnswer: fn(), onDenialMessageChange: fn() }),
      error: 'Could not send the answer. Try again.',
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('alert')).toHaveTextContent(
        'Could not send the answer. Try again.',
      );
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Allow once' }),
      ).toBeEnabled();
    },
  };
}
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

function denyWithoutMessage(width: number): Story {
  return {
    args: { denialMessage: '' },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await expect(args.onDenialMessageChange).toHaveBeenCalledWith(undefined);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
      });
    },
  };
}
export const DenyWithoutMessagePhone = denyWithoutMessage(390);
export const DenyWithoutMessageWide = denyWithoutMessage(1440);

export const Keyboard: Story = {
  args: { denialMessage: 'Use a new branch.' },
  play: async ({ canvas, userEvent, args }) => {
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
  play: async ({ canvas, userEvent, args }) => {
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
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
  };
}
export const ConflictPhone = conflict(390);
export const ConflictWide = conflict(1440);
export const SecondAgentConflictPhone = conflict(390, permissionMocks[1]);
export const SecondAgentConflictWide = conflict(1440, permissionMocks[1]);

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

function galleryFixture(mock: RequestMock, width: number): Story {
  const props = permissionProps({ mock });
  return {
    render: () => Gallery.render({ ...galleryMeta.args, agent: mock.agent }),
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getAllByText(props.request.title).length,
      ).toBeGreaterThan(0);
      if (!props.input) throw new Error('Recorded permission needs input.');
      await expect(
        canvas.getAllByText(props.input, { normalizer: (text): string => text })
          .length,
      ).toBeGreaterThan(0);
    },
  };
}
const [firstGalleryAgent, secondGalleryAgent] = permissionMocks;
if (!firstGalleryAgent || !secondGalleryAgent)
  throw new Error('Recorded gallery needs both Agents.');
export const GalleryFirstAgentPhone: Story = galleryFixture(
  firstGalleryAgent,
  390,
);
export const GalleryFirstAgentWide: Story = galleryFixture(
  firstGalleryAgent,
  1024,
);
export const GallerySecondAgentPhone: Story = galleryFixture(
  secondGalleryAgent,
  390,
);
export const GallerySecondAgentWide: Story = galleryFixture(
  secondGalleryAgent,
  1024,
);
