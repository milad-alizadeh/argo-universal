import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { RequestMock } from '@repo/mocks/app';
import { expect, within } from 'storybook/test';
import { FeedItem, toFeedView } from '../../../src/features/feed';
import { permissionMocks } from '../../../src/features/requests/components/request.mocks';
import { RequestFrame } from '../../../src/lib/product/request-frame';
import {
  allowedOnceAnswer,
  type Story,
} from './permission-story-context.test.mocks';

type ToolCallUpdate = Extract<
  SessionUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

type ArgoMeta = NonNullable<ToolCallUpdate['_meta']>['argo'];

interface ChosenOption {
  name: string;
  kind: 'allow_always' | 'reject_always';
}

export function permissionFeed(
  width: number,
  recording: number,
  answered: boolean,
): Story {
  const mock = recordedMock(recording);

  return answered ? outcomeFeed(width, mock) : approvalFeed(width, mock);
}

function approvalFeed(width: number, mock: RequestMock): Story {
  return {
    render: feedGroups(mock.pending.rows, mock.pending.snapshot),
    play: async () => {
      const canvas = within(document.body);
      await settleViewport(width);
      const row = pendingToolCall(mock);
      await expect(
        canvas.getByText('Awaiting approval', { exact: true }),
      ).toBeVisible();
      await expect(
        canvas.getAllByText('Awaiting approval', { exact: true }),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole('button', { name: row.title }),
      ).toBeVisible();
    },
  };
}

function outcomeFeed(width: number, mock: RequestMock): Story {
  return {
    render: feedGroups(mock.answered.rows, mock.answered.snapshot),
    play: async ({ userEvent }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(canvas.getByText(allowedOnceAnswer)).toBeVisible();
      await userEvent.click(canvas.getByRole('button'));
      await expect(canvas.getAllByText(allowedOnceAnswer)).toHaveLength(1);
      await userEvent.click(canvas.getByRole('button'));
      await expect(canvas.getByText(allowedOnceAnswer)).toBeVisible();
    },
  };
}

// An ACP Agent names its own options: the answered recording with an option the Agent named.
export function chosenOptionFeed(
  width: number,
  recording: number,
  option: ChosenOption,
): Story {
  const mock = recordedMock(recording);
  const rows = mock.answered.rows.map((row) => withChosenOption(row, option));

  return {
    render: feedGroups(rows, mock.answered.snapshot),
    play: async () => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(
        canvas.getByText(`You chose ${option.name}`, { exact: true }),
      ).toBeVisible();
      await expect(
        canvas.queryByText(allowedOnceAnswer),
      ).not.toBeInTheDocument();
    },
  };
}

function recordedMock(recording: number): RequestMock {
  const mock = permissionMocks[recording];

  if (!mock) throw new Error('Permission coverage needs both #54 recordings.');

  return mock;
}

function feedGroups(
  rows: SessionUpdate[],
  snapshot: SessionSnapshot,
): Story['render'] {
  const groups = toFeedView(rows, snapshot).items.filter(
    (item) => item.type === 'group',
  );

  return () => (
    <RequestFrame>
      {groups.map((item) => (
        <FeedItem key={item.id} item={item} imageUrl={() => ''} />
      ))}
    </RequestFrame>
  );
}

function pendingToolCall({ pending }: RequestMock): ToolCallUpdate {
  const row = pending.rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === pending.snapshot.pendingPermission?.toolCallId,
  );

  if (row?.sessionUpdate !== 'tool_call_update')
    throw new Error('Recording needs the pending Tool call.');

  return row;
}

function withChosenOption(
  row: SessionUpdate,
  option: ChosenOption,
): SessionUpdate {
  if (row.sessionUpdate !== 'tool_call_update') return row;

  return withOutcome(row, option);
}

function withOutcome(
  row: ToolCallUpdate,
  option: ChosenOption,
): ToolCallUpdate {
  const argo = argoMeta(row);

  if (!argo?.permissionOutcome) return row;

  const permissionOutcome = {
    outcome: 'selected' as const,
    optionId: `${option.kind}-option`,
    ...option,
  };

  return {
    ...row,
    _meta: { ...row._meta, argo: { ...argo, permissionOutcome } },
  };
}

function argoMeta(row: ToolCallUpdate): ArgoMeta | undefined {
  return row._meta?.argo;
}
