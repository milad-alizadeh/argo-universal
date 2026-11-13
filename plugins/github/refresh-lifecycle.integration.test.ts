import { expect, it } from 'vitest';
import {
  attached,
  changePull,
  openChanges,
  type OpenChanges,
  tick,
} from './journey-watch';

const slow = 60_000;

const renamed = 'Renamed';

it(
  'shares one read per pull request between the Workbench and the Inspector, keeps asking while either is open, and stops when both close',
  async () => {
    const run = await attached(1);
    const workbench = openChanges(run);
    const inspector = openChanges(run);

    await workbench.next();
    await inspector.next();

    const pulls = run.github.pullReads().length;
    const checks = run.github.checkReads().length;

    changePull(run, 1, { title: renamed });
    await tick(run);
    await workbench.next();
    await inspector.next();

    expect(run.github.pullReads()).toHaveLength(pulls + 1);
    expect(run.github.checkReads()).toHaveLength(checks + 1);

    workbench.close();
    changePull(run, 1, { title: 'Renamed again' });
    await tick(run);

    expect(await inspector.next()).toMatchObject([{ title: 'Renamed again' }]);

    inspector.close();

    const reads = run.github.requests.length;

    await tick(run);
    await tick(run);

    expect(run.github.requests).toHaveLength(reads);
  },
  slow,
);

// The list's next answer that has a Change in it: leaving the Plugin out and bringing it back are answers too.
async function nextWithChanges(open: OpenChanges): Promise<object[]> {
  const answer = await open.next();

  return answer.length ? answer : nextWithChanges(open);
}

it(
  'stops reading GitHub while the Plugin is disabled with a list open, and reads again once it is enabled, without the list reopening',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    await open.next();
    await run.test.plugins.setEnabled('github', false);

    const whileOff = run.github.requests.length;

    changePull(run, 1, { title: renamed });
    await tick(run);
    await tick(run);

    expect(run.github.requests).toHaveLength(whileOff);

    await run.test.plugins.setEnabled('github', true);
    await tick(run);

    expect(await nextWithChanges(open)).toMatchObject([{ title: renamed }]);
    expect(run.github.requests.length).toBeGreaterThan(whileOff);

    const running = run.github.requests.length;

    changePull(run, 1, { title: 'After' });
    await tick(run);

    expect(await nextWithChanges(open)).toMatchObject([{ title: 'After' }]);
    expect(run.github.requests.length).toBeGreaterThan(running);
  },
  slow,
);
