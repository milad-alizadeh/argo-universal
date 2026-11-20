import type { OpenPage, PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  project,
  refusedTitle,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';
import { attach } from './session-slot-fixture';

const mark = 'In Session';

const session = { projectId: project.id, branch: null, title: 'Fix it' };

const first = 'session-1';

const second = 'session-2';

// The tracker with GitHub chosen, where Argo still has the Sessions named.
async function trackerWith(sessionIds: string[]): Promise<PluginTest> {
  const sessions = Object.fromEntries(sessionIds.map((id) => [id, session]));
  const tracked = await trackedGitHub([project], { sessions });

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));

  return tracked.test;
}

// A Session other than the fixture's own attaches itself to Issue 42, as its Agent would.
async function attachAs(test: PluginTest, sessionId: string): Promise<void> {
  await test.operations.run({
    name: 'attach',
    params: { number: 42 },
    caller: { sessionId, projectId: project.id },
  });
}

const openList = async (test: PluginTest): Promise<OpenPage> =>
  (await test.pages.open({ path: '/' })).press('Open');

it('marks only the row of the Issue a Session is attached to', async () => {
  const test = await trackerWith([first]);
  await attach(test, 'attach');

  const list = await openList(test);

  expect(list.find(mark).props.icon).toBe('agent');
  expect(JSON.stringify(list.find(refusedTitle))).not.toContain(mark);
}, 20_000);

it('counts the Sessions on a row with more than one', async () => {
  const test = await trackerWith([first, second]);
  await attach(test, 'attach');
  await attachAs(test, second);

  const list = await openList(test);

  expect(list.findText('2 Sessions')).toBeDefined();
}, 20_000);

it('drops the mark once the Session is detached', async () => {
  const test = await trackerWith([first]);
  await attach(test, 'attach');
  const list = await openList(test);

  await attach(test, 'detach');
  await list.draw();

  expect(list.findText(mark)).toBeUndefined();
}, 20_000);

it('leaves the row unmarked when the attached Session has gone', async () => {
  const test = await trackerWith([]);
  await attach(test, 'attach');

  const list = await openList(test);

  expect(list.findText(mark)).toBeUndefined();
}, 20_000);

it('leaves the row unmarked when the attached Session is archived', async () => {
  const sessions = { [first]: { ...session, archived: true } };
  const tracked = await trackedGitHub([project], { sessions });

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  await attach(tracked.test, 'attach');

  const list = await openList(tracked.test);

  expect(list.findText(mark)).toBeUndefined();
}, 20_000);
