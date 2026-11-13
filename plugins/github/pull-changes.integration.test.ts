import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import {
  attach,
  caller,
  changesOf,
  journey,
  project,
  secondSessionId,
  sessionId,
  type Journey,
} from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const secondSession = { sessionId: secondSessionId, projectId: project.id };

it(
  'tells Open, draft, conflicting, Merged and Closed pull requests apart',
  async () => {
    const run = await journey();

    const pulls = [
      pullOf(repository, 1, { draft: true, mergeable_state: 'dirty' }),
      pullOf(repository, 2, { state: 'closed', merged: true }),
      pullOf(repository, 3, { state: 'closed' }),
    ];

    for (const [key, pull] of pulls) run.github.pulls.set(key, pull);

    for (const number of [1, 2, 3]) await attach(run, `#${number}`);

    expect(await changesOf(run)).toMatchObject([
      { stage: 'open', draft: true, conflict: true },
      { stage: 'merged' },
      { stage: 'closed' },
    ]);
  },
  slow,
);

it(
  "lists the Session's pull requests for an Agent through a read Operation",
  async () => {
    const run = await journey();

    await attach(run, `${repository}#12`);

    expect(
      await run.test.operations.run({ name: 'list', caller }),
    ).toMatchObject({ changes: [{ id: 'github:owner/repository#12' }] });
  },
  slow,
);

it(
  "keeps the association in the Plugin's own storage by repository and number",
  async () => {
    const run = await journey();

    await attach(run, `${repository}#12`);

    const [stored] = await run.test.storage.execute([
      {
        sql: 'SELECT project_id, session_id, repository, number FROM pull_associations',
        params: [],
        method: 'all',
      },
    ]);

    expect(stored?.rows).toEqual([[project.id, sessionId, repository, 12]]);
  },
  slow,
);

// An association an earlier Server run stored, whose pull request GitHub cannot answer for now.
async function associateUnreadable(run: Journey): Promise<void> {
  await attach(run, `${repository}#12`);
  await run.test.storage.execute([
    {
      sql: "INSERT INTO pull_associations VALUES ('project-1', 'session-2', 'owner/repository', 13, '2026-01-01')",
      params: [],
      method: 'run',
    },
  ]);
}

it(
  'leaves a failed first read out and says why, instead of answering no Changes',
  async () => {
    const run = await journey();

    await associateUnreadable(run);

    expect(await changesOf(run, secondSession)).toEqual([]);
    expect(await run.test.log()).toContain('items provider threw');
  },
  slow,
);

it(
  'lists the pull request it could not read with the reason, never leaving it out',
  async () => {
    const run = await journey();

    await associateUnreadable(run);

    expect(
      await run.test.operations.run({ name: 'list', caller: secondSession }),
    ).toMatchObject({
      changes: [{ number: 13, error: expect.stringContaining('not found') }],
    });
  },
  slow,
);
