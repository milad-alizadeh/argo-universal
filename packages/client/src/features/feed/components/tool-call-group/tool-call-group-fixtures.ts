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
