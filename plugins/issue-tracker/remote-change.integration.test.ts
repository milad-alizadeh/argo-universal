import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  follow,
  issueTitle,
  project,
  signedIn,
  type PageView,
  wait,
} from './journey-fixture';

type Test = Awaited<ReturnType<typeof signedIn>>['test'];

const testTimeout = 20_000;

const noRemote = 'This Project has no GitHub remote.';

async function setRemote(test: Test, originUrl: string | null): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), 'argo-remote-'));

  await test.projects.add({ ...project, originUrl, path });
}

async function openList(originUrl: string | null): Promise<Test> {
  const { test } = await signedIn([{ ...project, originUrl }]);

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
  'lists Issues when Check again is pressed after the Project gains its remote',
  async () => {
    const test = await openList(null);
    const list = await openFilter(test);

    await expect.poll(() => list.findText(noRemote), wait).toBeDefined();
    await setRemote(test, project.originUrl);
    await list.press('Check again');

    await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
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
