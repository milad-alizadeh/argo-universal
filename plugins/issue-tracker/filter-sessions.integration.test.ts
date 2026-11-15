import type { OpenPage } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  project,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';
import { attach } from './session-slot-fixture';

const mark = 'In Session';

const session = { projectId: project.id, branch: null, title: 'Fix it' };

// The open Issues' list after an Agent attached `session-1` to Issue 42, with the Sessions Argo still has.
async function openList(sessions: Record<string, typeof session>): Promise<{
  list: OpenPage;
  detach: () => Promise<void>;
}> {
  const tracked = await trackedGitHub([project], { sessions });

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  await attach(tracked.test, 'attach');

  const root = await tracked.test.pages.open({ path: '/' });

  return {
    list: await root.press('Open'),
    detach: () => attach(tracked.test, 'detach'),
  };
}

it('marks the row of an Issue a Session is attached to, until it is detached', async () => {
  const { list, detach } = await openList({ 'session-1': session });

  expect(list.findText(mark)?.node.props.icon).toBe('agent');

  await detach();
  await list.draw();

  expect(list.findText(mark)).toBeUndefined();
}, 20_000);

it('leaves the row unmarked when the attached Session has gone', async () => {
  const { list } = await openList({});

  expect(list.findText(mark)).toBeUndefined();
}, 20_000);
