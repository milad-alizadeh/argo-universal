import type { RequestMock } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  agentOptions,
  agentOptionsProps,
  agentOptionsWithAlwaysReject,
  permissionProps,
  permissionMocks,
} from '../../mocks/request-mock';
import { RequestFrame } from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { toFeedView } from '../feed/to-feed-view';
import { FeedItem } from './feed-item';
import { PermissionRequest } from './permission-request';
import galleryMeta, { Overview as Gallery } from './permission-request.stories';

const allowOnceLabel = 'Allow once';
const allowedOnceAnswer = 'You allowed this once';
const allowOptions = 'Allow options';
const rejectOptions = 'Reject options';
const alwaysReject = 'Always Reject';

const denialFeedback = 'Keep the cache.';

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
    args: { feedback: true, denialMessage: denialFeedback },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', {
        name: 'What should the Agent do instead?',
      });
      await expect(input).toHaveFocus();
      await expect(input).toHaveValue(denialFeedback);
      await userEvent.click(canvas.getByRole('button', { name: 'Deny' }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject_once',
        message: denialFeedback,
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
        canvas.getByRole('button', { name: allowOnceLabel }),
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
    args: { feedback: true, denialMessage: '' },
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
  args: { feedback: true, denialMessage: 'Use a new branch.' },
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
  args: { feedback: true },
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
          canvas.queryByRole('button', { name: allowOnceLabel }),
        ).not.toBeInTheDocument();
      else
        await expect(
          canvas.getByRole('button', { name: allowOnceLabel }),
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
  const state = answered ? mock.answered : mock.pending;
  const groups = toFeedView(state.rows, state.snapshot).items.filter(
    (item) => item.type === 'group',
  );
  return {
    render: () => (
      <RequestFrame>
        {groups.map((item) => (
          <FeedItem key={item.id} item={item} imageUrl={() => ''} />
        ))}
      </RequestFrame>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      if (answered) {
        await expect(canvas.getByText(allowedOnceAnswer)).toBeVisible();
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getAllByText(allowedOnceAnswer)).toHaveLength(1);
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getByText(allowedOnceAnswer)).toBeVisible();
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

const alwaysAllow = 'Always Allow';
const alwaysAllowId = 'allow-always';
const optionNames = agentOptions.map((option) => option.name);
if (optionNames.join() !== 'Always Allow,Allow,Reject')
  throw new Error('Recorded catalog needs Always Allow, Allow and Reject.');

function agentOptionsArgs(
  mock?: RequestMock,
  options = agentOptions,
): Story['args'] {
  return agentOptionsProps({
    mock,
    options,
    onAnswer: fn(),
    onDenialMessageChange: fn(),
  });
}

async function pickFromMenu(
  userEvent: { click: (element: Element) => Promise<void> },
  option: string,
): Promise<void> {
  const overlay = within(document.body);
  const item = await overlay.findByRole('menuitemradio', { name: option });
  await waitFor(() => expect(item).toBeVisible());
  await userEvent.click(item);
  await waitFor(() =>
    expect(
      overlay.queryByRole('menuitemradio', { name: option }),
    ).not.toBeInTheDocument(),
  );
}

async function pickFromSheet(
  userEvent: { click: (element: Element) => Promise<void> },
  label: string,
  option: string,
): Promise<void> {
  const overlay = within(document.body);
  const sheet = within(await overlay.findByRole('dialog', { name: label }));
  await userEvent.click(sheet.getByRole('button', { name: option }));
  await waitFor(() =>
    expect(
      overlay.queryByRole('dialog', { name: label }),
    ).not.toBeInTheDocument(),
  );
}

// Desktop merges every allow option into one split button; the chevron picks what it sends.
function allowMenuWide(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(1440);
      await expect(
        canvas.queryByRole('button', { name: alwaysAllow }),
      ).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromMenu(userEvent, alwaysAllow);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysAllow }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}
export const AllowMenuWide = allowMenuWide();
export const SecondAgentAllowMenuWide = allowMenuWide(permissionMocks[1]);

// Enter chooses the allow-once option, even when the Agent lists another first.
function allowOnceLeads(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(1440);
      await userEvent.click(canvas.getByText(args.request.title));
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({ optionId: 'allow' });
    },
  };
}
export const AllowOnceLeads = allowOnceLeads();
export const SecondAgentAllowOnceLeads = allowOnceLeads(permissionMocks[1]);

// Once picked, Enter sends the picked allow option.
function enterSendsPicked(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(1440);
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromMenu(userEvent, alwaysAllow);
      await userEvent.click(canvas.getByText(args.request.title));
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}
export const EnterSendsPicked = enterSendsPicked();
export const SecondAgentEnterSendsPicked = enterSendsPicked(permissionMocks[1]);

function rejectMenuWide(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock, agentOptionsWithAlwaysReject),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(1440);
      await expect(
        canvas.queryByRole('button', { name: alwaysReject }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: rejectOptions }),
      );
      await pickFromMenu(userEvent, alwaysReject);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysReject }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: 'reject-always',
      });
    },
  };
}
export const RejectMenuWide = rejectMenuWide();
export const SecondAgentRejectMenuWide = rejectMenuWide(permissionMocks[1]);

// Phone groups options like desktop: two controls, allow on top; the chevron opens a Sheet.
function groupedPhone(mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock, agentOptionsWithAlwaysReject),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(390);
      const buttons = canvas.getAllByRole('button');
      await expect(buttons).toHaveLength(4);
      await expect(buttons[0]).toHaveAccessibleName('Allow');
      await expect(buttons[1]).toHaveAccessibleName(allowOptions);
      await expect(buttons[2]).toHaveAccessibleName('Reject');
      await expect(buttons[3]).toHaveAccessibleName(rejectOptions);
      await userEvent.click(canvas.getByRole('button', { name: allowOptions }));
      await pickFromSheet(userEvent, allowOptions, alwaysAllow);
      await expect(args.onAnswer).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: alwaysAllow }));
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        optionId: alwaysAllowId,
      });
    },
  };
}
export const GroupedPhone = groupedPhone();
export const SecondAgentGroupedPhone = groupedPhone(permissionMocks[1]);

// Without delivered feedback, rejecting answers at once and offers no message field.
function rejectWithoutFeedback(width: number, mock?: RequestMock): Story {
  return {
    args: agentOptionsArgs(mock),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Reject' }));
      await expect(args.onDenialMessageChange).not.toHaveBeenCalled();
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(args.onAnswer).toHaveBeenCalledWith({ optionId: 'reject' });
    },
  };
}
export const RejectWithoutFeedbackPhone = rejectWithoutFeedback(390);
export const RejectWithoutFeedbackWide = rejectWithoutFeedback(1440);
export const SecondAgentRejectWithoutFeedbackPhone = rejectWithoutFeedback(
  390,
  permissionMocks[1],
);
export const SecondAgentRejectWithoutFeedbackWide = rejectWithoutFeedback(
  1440,
  permissionMocks[1],
);
