import { expect, it } from 'vitest';
import { queueWrites, startTestWriter } from '#mocks/queued-writes';
import type { WriterJob } from '../storage';
import {
  type AnnouncedJob,
  onWriterChange,
  type WriterChange,
} from './writer-changes';

const job = (roles: Partial<AnnouncedJob>): WriterJob => ({
  describe: (): string => 'a job of another module',
  commit: (): void => undefined,
  ...roles,
});

const named = { sessionIds: ['session-1'], turnIds: ['turn-1'] };

it.each([
  {
    kind: 'names',
    roles: { announcedChange: (): WriterChange => named },
    change: named,
  },
  { kind: 'does not name', roles: {}, change: { sessionIds: [], turnIds: [] } },
])(
  'announces what a job of any module $kind when it queues and again when it commits',
  async ({ roles, change }): Promise<void> => {
    const writer = startTestWriter();
    const changes: WriterChange[] = [];

    const subscription = onWriterChange(writer, (announced): void => {
      changes.push(announced);
    });

    const { committed } = queueWrites(writer, [job(roles)]);
    await committed;
    subscription.unsubscribe();
    expect(changes).toEqual([change, change]);
  },
);
