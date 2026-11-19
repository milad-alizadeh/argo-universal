import type { CompactionUpdate, Notice } from '@repo/contracts';
import {
  argoToolsNoticeDescription,
  argoToolsNoticeTitle,
} from '@repo/contracts/agents/argo-tools-notice';
import {
  compactionStates,
  noticeStates,
} from '../../../../../mocks/feed-paper';
import type { FeedNoticeProps } from './feed-notice';

function noticeOf(severity: string): Notice {
  const row = noticeStates.find((state) => state.severity === severity);

  if (!row) throw new Error(`Feed mocks need a ${severity} Notice`);

  return row;
}

function compactionOf(status: string): CompactionUpdate {
  const row = compactionStates.find((state) => state.status === status);

  if (!row) throw new Error(`Feed mocks need a ${status} Compaction`);

  return row;
}

export const infoNotice = { row: noticeOf('info') } satisfies FeedNoticeProps;

// The Engine's notice after a first Turn whose Agent never started `argo mcp` (ADR-0053).
export const missingArgoToolsNotice = {
  row: {
    ...noticeOf('info'),
    title: argoToolsNoticeTitle,
    description: argoToolsNoticeDescription(true),
  },
} satisfies FeedNoticeProps;

// The Engine's one Notice when a Voice call ends by failure, written outside any Turn.
export const voiceCallFailedNotice = {
  row: {
    ...noticeOf('warning'),
    title: 'Voice call failed',
    description: 'The connection to the voice failed.',
  },
} satisfies FeedNoticeProps;

export const warningNotice = {
  row: {
    ...noticeOf('warning'),
    title:
      'This session was recorded with model `gpt-6.2-astra` but is resuming with `gpt-6.2-sol`. Consider switching back to the original model to continue.',
  },
} satisfies FeedNoticeProps;

export const errorNotice = { row: noticeOf('error') } satisfies FeedNoticeProps;

export const unrecognisedNotice = {
  row: noticeOf('unrecognised'),
} satisfies FeedNoticeProps;

export const compactingNotice = {
  row: compactionOf('in_progress'),
} satisfies FeedNoticeProps;

export const compactedNotice = {
  row: compactionOf('completed'),
} satisfies FeedNoticeProps;

export const compactionFailedNotice = {
  row: compactionOf('failed'),
} satisfies FeedNoticeProps;

export const compactionStoppedNotice = {
  row: compactionOf('cancelled'),
} satisfies FeedNoticeProps;
