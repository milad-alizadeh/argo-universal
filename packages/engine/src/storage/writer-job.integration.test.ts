import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { SqlJob } from '#mocks/storage-job';
import {
  AtomicWriterJob,
  type WriterJob,
  writeJobs,
  writeWriterBatch,
} from './writer-job';

let database: Database;

let removeDatabase: () => void;

const setTitle = (title: string): SqlJob =>
  new SqlJob({ statement: `UPDATE session SET title = '${title}'` });

const failedQuery = 'Failed query';

const selectTitle = ():
  | Pick<typeof session.$inferSelect, 'title'>
  | undefined => database.select({ title: session.title }).from(session).get();

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
});

afterEach((): void => removeDatabase());

describe.each([
  { name: 'batch', wrap: (jobs: WriterJob[]): WriterJob[] => jobs },
  {
    name: 'atomic job',
    wrap: (jobs: WriterJob[]): WriterJob[] => [new AtomicWriterJob(jobs)],
  },
])('$name', ({ wrap }) => {
  it('commits the jobs in the order they arrive', (): void => {
    writeJobs(database, wrap([setTitle('first'), setTitle('second')]));

    expect(selectTitle()).toEqual({ title: 'second' });
  });

  it('commits nothing when one job fails', (): void => {
    const jobs = [
      setTitle('saved'),
      new SqlJob({ statement: 'INSERT INTO no_such_table VALUES (1)' }),
    ];

    expect(() => writeJobs(database, wrap(jobs))).toThrow(failedQuery);
    expect(selectTitle()).toEqual({ title: '' });
  });
});

describe('a Writer batch', (): void => {
  const breaksConstraint = new SqlJob({
    statement: 'UPDATE session SET title = NULL',
  });

  it('drops a job that breaks a constraint and commits the others around it', (): void => {
    const written = writeWriterBatch(database, [
      setTitle('first'),
      breaksConstraint,
      setTitle('last'),
    ]);

    expect(written.dropped.map(({ index }) => index)).toEqual([1]);
    expect(String(written.dropped[0]?.error)).toBe(
      'Error: NOT NULL constraint failed: session.title',
    );
    expect(selectTitle()).toEqual({ title: 'last' });
  });

  it('rolls back a dropped atomic job whole', (): void => {
    const written = writeWriterBatch(database, [
      new AtomicWriterJob([setTitle('half'), breaksConstraint]),
    ]);

    expect(written.dropped.map(({ index }) => index)).toEqual([0]);
    expect(selectTitle()).toEqual({ title: '' });
  });

  it('commits nothing when a job fails for another reason', (): void => {
    const jobs = [
      setTitle('saved'),
      breaksConstraint,
      new SqlJob({ statement: 'INSERT INTO no_such_table VALUES (1)' }),
    ];

    expect(() => writeWriterBatch(database, jobs)).toThrow(failedQuery);
    expect(selectTitle()).toEqual({ title: '' });
  });

  it('commits nothing when a trigger refuses a job, so the Writer retries it', (): void => {
    database.$client.exec(
      "CREATE TRIGGER refuse_title BEFORE UPDATE ON session WHEN NEW.title = 'refused' BEGIN SELECT RAISE(FAIL, 'storage unavailable'); END",
    );

    expect(() =>
      writeWriterBatch(database, [setTitle('saved'), setTitle('refused')]),
    ).toThrow(failedQuery);
    expect(selectTitle()).toEqual({ title: '' });
  });
});
