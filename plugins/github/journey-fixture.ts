import { fileURLToPath } from 'node:url';
import {
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

export type Journey = { test: PluginTest; github: GitHubFixture };

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

const signInLabel = 'Sign in to GitHub';

const signedInText = 'Signed in as octocat';

const pollMs = 1000;

const pollLimit = 5;

// Signs in as a person does: asks for the code on the sign-in page, and lets the flow poll until GitHub approves it.
async function signIn(test: PluginTest): Promise<void> {
  const page = await test.pages.open({ path: '/sign-in' });

  await page.press(signInLabel);

  for (let poll = 0; poll < pollLimit; poll += 1) {
    if (page.findText(signedInText)) break;

    await test.clock.advance(pollMs);
    await page.draw();
  }

  expect(page.findText(signedInText)).toBeDefined();
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

async function startOver(github: GitHubFixture): Promise<PluginTest> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'github',
    version: '0.0.0',
    projects: [project, otherProject],
    network: github.network,
    clockStart: 0,
    sessions,
  });

  onTestFinished(() => test.close());

  return test;
}

// The Plugin over a fixture GitHub, nobody signed in.
export async function signedOutJourney(): Promise<Journey> {
  const github = await githubFixture();

  for (const [key, pull] of defaultPulls) github.pulls.set(key, pull);

  return { test: await startOver(github), github };
}

// The same, with the person already signed in.
export async function journey(): Promise<Journey> {
  const run = await signedOutJourney();

  await signIn(run.test);

  return run;
}

// What an Agent's `argo run github.attach` does for the calling Session.
export async function attach(
  { test }: Journey,
  reference: string,
  as: Caller = caller,
): Promise<void> {
  await test.operations.run({
    name: 'attach',
    params: { reference },
    caller: as,
  });
}

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

async function firstAnswer(
  { test }: Journey,
  session: Caller,
): Promise<Answer | undefined> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const answers = test.slotItems(
    { slotId: changesSlot, contexts: [session] },
    { signal: controller.signal },
  );

  return (await answers.next()).value;
}

// The Changes Argo would draw for one Session: the Slot's first merged answer, its items in Slot order.
export async function changesOf(
  run: Journey,
  session: Caller = caller,
): Promise<object[]> {
  const answer = await firstAnswer(run, session);

  return Object.values(answer ?? {}).flatMap(({ items }) =>
    items.map(({ item }) => item),
  );
}
