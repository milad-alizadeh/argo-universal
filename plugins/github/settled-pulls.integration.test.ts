import { expect, it } from 'vitest';
import {
  attached,
  changePull,
  openChanges,
  repository,
  tick,
} from './journey-watch-fixture';

const slow = 60_000;

// A Closed pull request cannot change under a list that draws it again, so the list does not ask GitHub for it each time.
it(
  'asks GitHub nothing more for a Closed pull request when the Changes list is asked again, and for an Open one it does',
  async () => {
    const run = await attached(1, 2);

    changePull(run, 1, { state: 'closed' });
    const open = openChanges(run);

    await open.next();
    await tick(run);
    await open.next().catch(() => []);

    const asked = run.github.pullReads().length;

    await tick(run);
    await open.next().catch(() => []);

    const paths = run.github
      .pullReads()
      .slice(asked)
      .map(({ path }) => path);

    expect(paths).toContain(`/repos/${repository}/pulls/2`);
    expect(paths).not.toContain(`/repos/${repository}/pulls/1`);
  },
  slow,
);
