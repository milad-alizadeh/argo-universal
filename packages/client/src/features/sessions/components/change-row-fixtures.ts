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

// GitHub's rate limit refused the latest read: the row keeps what it last knew, with a dash where its checks go.
export const rateLimitedChangeRow = {
  change: { ...checksPassedChangeRow.change, stale: 'rateLimited' as const },
} satisfies ChangeRowFixture;

const overflowChecks = Array.from({ length: 24 }, (_, index) => ({
  name: `Workflow ${index + 1}`,
  state: 'passed' as const,
}));

export const checksOverflowChangeRow = {
  change: {
    ...checksPassedChangeRow.change,
    checks: {
      passed: 24,
      failing: 0,
      running: 0,
      total: 24,
      details: overflowChecks,
    },
  },
} satisfies ChangeRowFixture;

const hiddenText = (row: Element): string[] =>
  [...row.querySelectorAll('[aria-hidden="true"]')].map(
    (node) => node.textContent,
  );

// A menu row's words as a screen reader hears them: its icon is hidden from one.
export const spokenText = (row: Element): string =>
  hiddenText(row).reduce(
    (text, glyph) => text.replace(glyph, ''),
    row.textContent,
  );
