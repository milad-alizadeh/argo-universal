import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MemorySecretStore,
  startPluginTest,
  type PluginTest,
  type PluginTestOptions,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { githubFixture, pullOf, type GitHubFixture } from './github-fixture';

export const project = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

export const otherProject = {
  id: 'project-2',
  name: 'Other Project',
  originUrl: null,
};

export const sessionId = 'session-1';

export const secondSessionId = 'session-2';

export const foreignSessionId = 'foreign-session';

export const changesSlot = 'argo/session/changes/v1';

export type Journey = {
  test: PluginTest;
  github: GitHubFixture;
  keep: Keep;
};

export type Caller = { sessionId: string; projectId: string };

export const caller: Caller = { sessionId, projectId: project.id };

const sharedNumber = 12;

// Two repositories can share a number, so the fixture holds both.
const defaultPulls = [
  pullOf('owner/repository', sharedNumber, { title: 'Add the thing' }),
  pullOf('fork-owner/repository', sharedNumber, {
    title: 'Same number elsewhere',
  }),
];

const pollMs = 1000;

const pollLimit = 5;

const provider = 'issue-tracker';

// Signs in through the Issue tracker, the Plugin that provides the GitHub Account this Plugin only borrows.
async function signIn(test: PluginTest): Promise<void> {
  await test.operations.run({ name: 'signIn', pluginId: provider });

  for (let poll = 0; poll < pollLimit; poll += 1) {
    await test.clock.advance(pollMs);
  }

  expect(test.accounts.list()).toHaveLength(1);
}

// Both first-party Plugins, side by side as the Server finds them: this one borrows what the other provides.
async function pluginsFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'argo-github-plugins-'));
  const here = fileURLToPath(new URL('.', import.meta.url));

  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  await symlink(here, join(folder, 'github'));
  await symlink(join(here, '..', provider), join(folder, provider));

  return folder;
}

const sessions = {
  [sessionId]: {
    projectId: project.id,
    branch: `feature-${sharedNumber}`,
    title: 'Work',
  },
  [secondSessionId]: { projectId: project.id, branch: null, title: 'Other' },
  [foreignSessionId]: {
    projectId: otherProject.id,
    branch: null,
    title: 'Elsewhere',
  },
} satisfies PluginTestOptions['sessions'];

type Keep = Required<Pick<PluginTestOptions, 'home' | 'secretStore'>>;

const closed = new WeakSet<PluginTest>();

const closeOnce = async (test: PluginTest): Promise<void> => {
  if (closed.has(test)) return;

  closed.add(test);
  await test.close();
};

const baseOptions = (
  github: GitHubFixture,
): Omit<PluginTestOptions, 'directory'> => ({
  pluginId: 'github',
  version: '0.0.0',
  projects: [project, otherProject],
  network: github.network,
  clockStart: 0,
  sessions,
});

async function startOver(
  github: GitHubFixture,
  keep: Keep,
): Promise<PluginTest> {
  const test = await startPluginTest({
    ...baseOptions(github),
    directory: await pluginsFolder(),
    ...keep,
  });

  onTestFinished(() => closeOnce(test));

  return test;
}

async function keepFolder(): Promise<Keep> {
  const home = await mkdtemp(join(tmpdir(), 'argo-github-home-'));

  onTestFinished(() => rm(home, { recursive: true, force: true }));

  return { home, secretStore: new MemorySecretStore() };
}

// The Plugin over a fixture GitHub, nobody signed in.
export async function signedOutJourney(): Promise<Journey> {
  const github = await githubFixture();

  for (const [key, pull] of defaultPulls) github.pulls.set(key, pull);

  const keep = await keepFolder();

  return { test: await startOver(github, keep), github, keep };
}

// The same, with the person already signed in.
export async function journey(): Promise<Journey> {
  const run = await signedOutJourney();

  await signIn(run.test);

  return run;
}

// A Server restart: the Plugin starts again over the same storage, Accounts and GitHub, with nothing kept in memory.
export async function restart(run: Journey): Promise<void> {
  await closeOnce(run.test);
  run.test = await startOver(run.github, run.keep);
  // The Server starts every Plugin at launch; this host starts one when it is first used, so wake the provider.
  await run.test.operations.run({ name: 'cancelSignIn', pluginId: provider });
}
