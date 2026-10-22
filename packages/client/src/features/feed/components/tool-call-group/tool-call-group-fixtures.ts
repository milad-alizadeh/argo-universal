import { permissionMock } from '../../../../../mocks/requests/recorded-requests';
import type { FeedGroup } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';
import { toolCallGroupMock } from '../tool-call.mocks';
import type { ToolCallGroupProps } from './tool-call-group';

// A story supplies the activity drawing; a fixture is the group and its clock.
type ToolCallGroupFixture = Omit<ToolCallGroupProps, 'renderActivity'>;

// A running group: its live Tool call heads the disclosure and the duration counts up.
export const runningGroup = {
  group: toolCallGroupMock.running,
  now: toolCallGroupMock.now,
} satisfies ToolCallGroupFixture;

// Parallel calls: the earlier command still runs, so the later read stays in the list.
export const parallelGroup = {
  group: toolCallGroupMock.parallel,
  now: toolCallGroupMock.now,
  initialOpen: true,
} satisfies ToolCallGroupFixture;

export const settledGroup = {
  group: toolCallGroupMock.group,
} satisfies ToolCallGroupFixture;

type RecordedPermission = (typeof permissionMock)['pending'];

function permissionGroup({ rows, snapshot }: RecordedPermission): FeedGroup {
  const group = toFeedView(rows, snapshot).items.find(
    (item): item is FeedGroup => item.type === 'group',
  );

  if (!group) throw new Error('The permission recording needs a group.');

  return group;
}

// The Tool call waits on the user: the group carries the Awaiting approval notice.
export const awaitingApprovalGroup = {
  group: permissionGroup(permissionMock.pending),
} satisfies ToolCallGroupFixture;

// The user allowed it once: the recorded outcome closes the group.
export const allowedOnceGroup = {
  group: permissionGroup(permissionMock.answered),
} satisfies ToolCallGroupFixture;
