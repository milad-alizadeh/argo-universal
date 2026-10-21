import type { ChangeRowProps } from './change-row';
import {
  closedChange,
  draftChange,
  mergedChange,
  openChange,
} from './change-stage/change-stage-fixtures';
import { pullRequestMocks } from './session-pull-request.mocks';

// A story supplies onOpen; a fixture is the Change the row draws, in the stage ChangeStage names.
type ChangeRowFixture = Omit<ChangeRowProps, 'onOpen'>;

// The whole meta line: the diff total, then the Change's checks still running.
export const checksRunningChangeRow = {
  change: { ...pullRequestMocks.checksRunning, ...openChange },
} satisfies ChangeRowFixture;

export const checksFailingChangeRow = {
  change: { ...pullRequestMocks.checksFailing, ...openChange },
} satisfies ChangeRowFixture;

export const checksPassedChangeRow = {
  change: { ...pullRequestMocks.checksPassed, ...openChange },
} satisfies ChangeRowFixture;

// No diff total and no checks yet, so the meta line carries the modifier alone.
export const draftChangeRow = {
  change: { ...pullRequestMocks.followUp, ...draftChange },
} satisfies ChangeRowFixture;

export const mergedChangeRow = {
  change: { ...pullRequestMocks.merged, ...mergedChange },
} satisfies ChangeRowFixture;

export const closedChangeRow = {
  change: { ...pullRequestMocks.closed, ...closedChange },
} satisfies ChangeRowFixture;
