import type { CompactionUpdate, Notice } from '@repo/contracts';
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

export const warningNotice = {
  row: noticeOf('warning'),
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
