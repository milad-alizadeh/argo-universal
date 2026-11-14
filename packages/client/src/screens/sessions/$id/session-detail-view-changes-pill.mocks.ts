import type { ChangesSummary } from '@repo/contracts';
import { fn } from 'storybook/test';
import type { SessionDetailViewProps } from './session-detail-view';
import { idleSession, longSession } from './session-detail-view.mocks';

const manyChanges = {
  files: 24,
  additions: 12_000,
  deletions: 400,
} satisfies ChangesSummary;

const withSummary = (
  session: typeof idleSession,
  summary?: ChangesSummary,
): SessionDetailViewProps => ({
  state: 'open',
  ...session,
  header: {
    ...session.header,
    changes: { summary, open: false, onOpenChange: fn() },
  },
});

// The Checkout has changes: the Composer's pill shows their totals.
export const changedSession = withSummary(idleSession, manyChanges);

// A long Feed, so the reader can scroll away from its end and Jump to latest shows with the pill.
export const changedLongSession = withSummary(longSession, manyChanges);

// A Checkout with no changed files, and one whose changes are not yet known.
export const cleanSession = withSummary(idleSession, {
  files: 0,
  additions: 0,
  deletions: 0,
});

export const unreadSession = withSummary(idleSession);
