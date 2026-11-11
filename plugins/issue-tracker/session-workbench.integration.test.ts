import { drawsNothing, type PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { project } from './journey-fixture';
import {
  attach,
  chosenTracker,
  trackerWithAttachedIssue,
} from './session-slot-fixture';

// The pages the manifest declares for the card and its Inspector tab.
const sessionCardPath = '/session-issue';

const sessionTabPath = '/session-issue/full';

const sessionId = 'session-1';

// What an App draws for a card page of this Session, or of another.
const draws = async (
  test: PluginTest,
  path: string,
  session = sessionId,
): Promise<boolean> => {
  const answer = await test.pages.draw({
    path,
    projectId: project.id,
    sessionId: session,
  });

  if (answer.kind !== 'tree') throw new Error(`${path} drew no tree`);

  return !drawsNothing(answer.root);
};

it('draws no card for a Session with no Issue attached', async () => {
  const test = await chosenTracker();

  expect(await draws(test, sessionCardPath)).toBe(false);
}, 20_000);

it('draws the card once an Agent attaches the Session', async () => {
  const test = await chosenTracker();

  await attach(test, 'attach');

  expect(await draws(test, sessionCardPath)).toBe(true);
}, 20_000);

it('draws no card again once the Session is detached', async () => {
  const test = await trackerWithAttachedIssue();

  await attach(test, 'detach');

  expect(await draws(test, sessionCardPath)).toBe(false);
}, 20_000);

it('draws no card for another Session than the one the Issue is attached to', async () => {
  const test = await trackerWithAttachedIssue();

  expect(await draws(test, sessionCardPath, 'session-2')).toBe(false);
}, 20_000);

it('draws the Inspector tab with its own line when there is no Issue', async () => {
  const test = await chosenTracker();

  expect(await draws(test, sessionTabPath)).toBe(true);
}, 20_000);

it('still draws a card for an attached Issue that cannot be read', async () => {
  const test = await chosenTracker();

  await test.operations.run({
    name: 'attach',
    params: { number: 9999 },
    caller: { sessionId, projectId: project.id },
  });

  expect(await draws(test, sessionCardPath)).toBe(true);
}, 20_000);
