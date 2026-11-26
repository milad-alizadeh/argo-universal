import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MemorySecretStore,
  startPluginTest,
  type PluginTest,
  type PluginTestOptions,
  type TestSession,
} from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import { cliPath } from './github-cli-fixture';
import { githubFixture, pullOf, type GitHubFixture } from './github-fixture';
import { archiveRecorder } from './journey-archive-fixture';
import { promptRecorder, withdrawRecorder } from './journey-prompts-fixture';
import { provider, signIn } from './journey-sign-in-fixture';

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

// A Project that lives on GitLab.
export const gitlabProject = {
  id: 'project-4',
  name: 'GitLab Project',
  originUrl: 'git@gitlab.com:owner/repository.git',
};

export const sessionId = 'session-1';

export const gitlabSessionId = 'gitlab-session';

export const secondSessionId = 'session-2';

export const foreignSessionId = 'foreign-session';

// A Session the Agent of `sessionId` started with session.new.
export const startedSessionId = 'started-session';

export const changesSlot = 'argo/session/changes/v1';

export const rowSlot = 'argo/session/row/v1';

export type Journey = {
  test: PluginTest;
  // What the Engine says of each Session; a test moves a Session to another branch by changing its `branch`.
  sessions: Sessions;
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

// Both first-party Plugins, side by side as the Server finds them: this one borrows what the other provides.
async function pluginsFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'argo-github-plugins-'));
  const here = fileURLToPath(new URL('.', import.meta.url));

  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  await symlink(here, join(folder, 'github'));
  await symlink(join(here, '..', provider), join(folder, provider));

  return folder;
}

const gitlabSession: SessionState = {
  projectId: gitlabProject.id,
  branch: 'feature-12',
  title: 'GitLab',
};

const sessionsOf = (): Sessions => ({
  [sessionId]: {
    projectId: project.id,
    branch: `feature-${sharedNumber}`,
    title: 'Work',
  },
  [secondSessionId]: { projectId: project.id, branch: null, title: 'Other' },
  [startedSessionId]: {
    projectId: project.id,
    branch: null,
    title: 'Started',
    startedBySessionId: sessionId,
  },
  [foreignSessionId]: {
    projectId: otherProject.id,
    branch: null,
    title: 'Elsewhere',
  },
  [gitlabSessionId]: { ...gitlabSession },
});

type SessionState = TestSession;

type Sessions = Record<
  | typeof sessionId
  | typeof secondSessionId
  | typeof foreignSessionId
  | typeof startedSessionId
  | typeof gitlabSessionId,
  SessionState
>;

type Keep = Required<Pick<PluginTestOptions, 'home' | 'secretStore'>>;

const closed = new WeakSet<PluginTest>();

const closeOnce = async (test: PluginTest): Promise<void> => {
  if (closed.has(test)) return;

  closed.add(test);
  await test.close();
};

const baseOptions = (
  github: GitHubFixture,
  sessions: Sessions,
): Omit<PluginTestOptions, 'directory'> => ({
  pluginId: 'github',
  version: '0.0.0',
  projects: [project, otherProject, gitlabProject],
  network: github.network,
  clockStart: 0,
  sessions,
  promptSession: promptRecorder(github),
  withdrawPrompt: withdrawRecorder(github),
  archiveSession: archiveRecorder(github),
});

type JourneyOptions = Pick<PluginTestOptions, 'path' | 'settings'>;

async function startOver(
  github: GitHubFixture,
  options: Keep & JourneyOptions,
  sessions: Sessions,
): Promise<PluginTest> {
  const test = await startPluginTest({
    ...baseOptions(github, sessions),
    directory: await pluginsFolder(),
    // No `gh` of the machine is ever read: a journey's CLI is logged out unless it brings its own.
    path: await cliPath('denied'),
    ...options,
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
export async function signedOutJourney(
  options: JourneyOptions = {},
): Promise<Journey> {
  const github = await githubFixture();

  for (const [key, pull] of defaultPulls) github.pulls.set(key, { ...pull });

  const keep = await keepFolder();
  const sessions = sessionsOf();

  return {
    test: await startOver(github, { ...keep, ...options }, sessions),
    sessions,
    github,
    keep,
  };
}

// The same, with the person already signed in.
export async function journey(options: JourneyOptions = {}): Promise<Journey> {
  const run = await signedOutJourney(options);

  await signIn(run.test);

  return run;
}

// A Server restart: the Plugin starts again over the same storage, Accounts and GitHub, with nothing kept in memory.
export async function restart(run: Journey): Promise<void> {
  await closeOnce(run.test);
  run.test = await startOver(run.github, run.keep, run.sessions);
  // The Server starts every Plugin at launch; this host starts one when it is first used, so wake the provider.
  await run.test.operations.run({ name: 'cancelSignIn', pluginId: provider });
}
