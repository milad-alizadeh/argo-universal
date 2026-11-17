import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  issueTitle,
  project,
  tracker,
  trackerPage,
  type OpenPage,
} from './journey-fixture';

type Test = Awaited<ReturnType<typeof tracker>>;

const testTimeout = 20_000;

const noRemote = 'This Project has no GitHub remote.';

// The EmptyState in the issue list's place that says why; the sidebar's Section footer says the same.
const noRemoteState = (node: WireNode): boolean =>
  node.type === 'EmptyState' && node.props.title === noRemote;

async function setRemote(test: Test, originUrl: string | null): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), 'argo-remote-'));

  await test.projects.add({ ...project, originUrl, path });
}

async function openList(originUrl: string | null): Promise<Test> {
  const test = await tracker([{ ...project, originUrl }]);
  await chooseGithub(await trackerPage(test));

  return test;
}

async function openFilter(test: Test): Promise<OpenPage> {
  const root = await test.pages.open({ path: '/' });

  return root.press('Open');
}

it(
  'lists Issues once a Project gains its GitHub remote after the Plugin started',
  async () => {
    const test = await openList(null);

    await setRemote(test, project.originUrl);

    const list = await openFilter(test);

    expect(list.findText(issueTitle)).toBeDefined();
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

    expect(list.find(noRemoteState)).toBeDefined();
    expect(list.findText(issueTitle)).toBeUndefined();
  },
  testTimeout,
);

it(
  'says the Project has no GitHub remote when it never had one',
  async () => {
    const test = await openList(null);
    const list = await openFilter(test);

    expect(list.find(noRemoteState)).toBeDefined();
  },
  testTimeout,
);
