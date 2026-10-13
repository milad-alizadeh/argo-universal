import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { SqlJob } from '#mocks/storage-job';
import { writeJobs } from './writer-job';

let database: Database;

let removeDatabase: () => void;

const setTitle = (title: string): SqlJob =>
  new SqlJob({ statement: `UPDATE session SET title = '${title}'` });

const selectTitle = ():
  | Pick<typeof session.$inferSelect, 'title'>
  | undefined => database.select({ title: session.title }).from(session).get();

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
});

afterEach((): void => removeDatabase());

it('commits the jobs in the order they arrive', (): void => {
  writeJobs(database, [setTitle('first'), setTitle('second')]);

  expect(selectTitle()).toEqual({ title: 'second' });
});

it('commits nothing when one job fails', (): void => {
  const jobs = [
    setTitle('saved'),
    new SqlJob({ statement: 'INSERT INTO no_such_table VALUES (1)' }),
  ];

  expect(() => writeJobs(database, jobs)).toThrow('Failed query');
  expect(selectTitle()).toEqual({ title: '' });
});
