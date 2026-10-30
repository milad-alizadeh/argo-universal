import type { SessionUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { row } from '#mocks/feed-storage-input';
import { submitWrites } from '#mocks/queued-writes';
import type { WriterJob } from '../storage';
import {
  type QueuedFeedJob,
  readQueuedFeed,
  readQueuedFeedRow,
} from './feed-storage';

// A job of a module Feed storage does not know: it shows only through the Feed rows it writes.
const foreignRows = (
  sessionId: string,
  rows: SessionUpdate[],
  maxRevision: number,
): WriterJob & QueuedFeedJob => ({
  describe: (): string => `Feed rows of Session ${sessionId}`,
  commit: (): void => undefined,
  queuedFeedRows: () => ({ sessionId, rows, maxRevision }),
});

it('reads the newest queued Feed rows of one Session from jobs of any module', (): void => {
  const first = row({ revision: 1 });
  const newer = row({ revision: 3, content: [{ type: 'text', text: 'Done' }] });
  const second = row({ id: 'row-2', position: 1, revision: 2 });

  const { writer } = submitWrites([
    foreignRows('session-1', [first], 1),
    foreignRows('session-2', [row({ sessionId: 'session-2' })], 9),
    foreignRows('session-1', [second, newer], 3),
  ]);

  expect(readQueuedFeed(writer, 'session-1')).toEqual({
    rows: [newer, second],
    maxRevision: 3,
    highestPosition: 1,
  });
  expect(
    readQueuedFeedRow(writer, { sessionId: 'session-1', id: 'row-1' }),
  ).toEqual(newer);
});
