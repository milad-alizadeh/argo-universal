import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  follow,
  issueTitle,
  project,
  slot,
  tracker,
  type PageView,
  wait,
} from './journey-fixture';

type Test = Awaited<ReturnType<typeof tracker>>;

const testTimeout = 20_000;

const noRemote = 'This Project has no GitHub remote.';

async function setRemote(test: Test, originUrl: string | null): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), 'argo-remote-'));

  await test.projects.add({ ...project, originUrl, path });
}

async function openList(originUrl: string | null): Promise<Test> {
  const test = await tracker([{ ...project, originUrl }]);
  await chooseGithub(test.slot(slot));

  return test;
}

async function openFilter(test: Test): Promise<PageView> {
  const root = await test.mount({ page: '/', surface: { platform: 'web' } });

  return follow(test, root, 'Open');
}

it(
  'lists Issues once a Project gains its GitHub remote after the Plugin started',
  async () => {
    const test = await openList(null);

    await setRemote(test, project.originUrl);

    const list = await openFilter(test);

    await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
    expect(list.findText(noRemote)).toBeUndefined();
  },
  testTimeout,
);

it(
  'says the Project has no GitHub remote once its remote is removed',
  async () => {
    const test = await openList(project.originUrl);

    await setRemote(test, null);

    const list = await openFilter(test);

    await expect.poll(() => list.findText(noRemote), wait).toBeDefined();
    expect(list.findText(issueTitle)).toBeUndefined();
  },
  testTimeout,
);

it(
  'says the Project has no GitHub remote when it never had one',
  async () => {
    const test = await openList(null);
    const list = await openFilter(test);

    await expect.poll(() => list.findText(noRemote), wait).toBeDefined();
  },
  testTimeout,
);
