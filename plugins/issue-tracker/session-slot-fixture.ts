import type { PluginTest } from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import {
  chooseGithub,
  project,
  tracker,
  trackerPage,
  type PageView,
} from './journey-fixture';

export const rowSlot = 'argo/session/row/v1';

export const barSlot = 'argo/session/bar/v1';

export const sessionId = 'session-1';

export const issuePage = `/projects/${project.id}/issues/42`;

type SlotId = typeof rowSlot | typeof barSlot;

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

// The Session's Issue number 42 is attached by an Agent, as `argo run issue-tracker.attach` does.
export const attach = async (
  test: PluginTest,
  name: 'attach' | 'detach',
): Promise<void> => {
  await test.operations.run({
    name,
    params: { number: 42 },
    caller: { sessionId, projectId: project.id },
  });
};

// The Tracker chosen, so the Issue's state can load.
export async function chosenTracker(): Promise<PluginTest> {
  const test = await tracker();

  await chooseGithub(trackerPage(test));

  return test;
}

export async function trackerWithAttachedIssue(): Promise<PluginTest> {
  const test = await chosenTracker();

  await attach(test, 'attach');

  return test;
}

// The answers Argo would redraw one Session's list with, each time the Plugin says its items changed.
export function watch(
  test: PluginTest,
  slotId: SlotId,
): AsyncGenerator<Answer> {
  const controller = new AbortController();
  onTestFinished(() => controller.abort());

  const contexts = [{ sessionId, projectId: project.id }];

  return test.slotItems({ slotId, contexts }, { signal: controller.signal });
}

export const itemsOf = (answer: Answer): unknown[] =>
  (answer[sessionId]?.items ?? []).map(({ item }) => item);

async function nextAnswer(answers: AsyncGenerator<Answer>): Promise<Answer> {
  const { value, done } = await answers.next();

  if (done) throw new Error('The Slot ended before it answered as expected.');

  return value;
}

// Each answer until one is the one the test waits for.
export async function until(
  answers: AsyncGenerator<Answer>,
  wanted: (answer: Answer) => boolean,
): Promise<Answer> {
  for (;;) {
    const answer = await nextAnswer(answers);

    if (wanted(answer)) return answer;
  }
}

// A page the Session's Workbench opens, for that Session.
export const mountFor = (
  test: PluginTest,
  page: string,
  session?: string,
): Promise<PageView> =>
  test.mount({
    page,
    surface: { platform: 'web' },
    projectId: project.id,
    sessionId: session,
  });
