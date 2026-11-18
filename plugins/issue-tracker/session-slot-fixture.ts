import type { PluginTest } from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import { chooseGithub, project, tracker, trackerPage } from './journey-fixture';

export const rowSlot = 'argo/session/row/v1';

export const barSlot = 'argo/session/bar/v1';

const sessionId = 'session-1';

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
  number = 42,
): Promise<void> => {
  await test.operations.run({
    name,
    params: { number },
    caller: { sessionId, projectId: project.id },
  });
};

// The Tracker chosen, so the Issue's state can load.
export async function chosenTracker(): Promise<PluginTest> {
  const test = await tracker();

  await chooseGithub(await trackerPage(test));

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

export const itemsOf = (answer: Answer): unknown[] => {
  const context = answer[sessionId];

  return context
    ? [...context.items, ...context.overflow].map(({ item }) => item)
    : [];
};

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

// How long after a failed first read the Issue tracker asks its Slots again.
const firstRetryMs = 15_000;

// Past the window in which Argo coalesces a Plugin's changes, which runs on the real clock (ADR-0060).
const changesSettleMs = 400;

// Argo coalesces the Plugin's changes on the real clock, so the Slots ask again only once that window is over.
const settled = (waiting: Promise<Answer>): Promise<Answer | null> =>
  Promise.race([
    waiting,
    new Promise<null>((done) => setTimeout(() => done(null), changesSettleMs)),
  ]);

// Moves the Plugin clock a retry at a time until an answer is the one wanted, as a failed read may land after a move.
export async function advancedUntil(
  test: PluginTest,
  answers: AsyncGenerator<Answer>,
  wanted: (answer: Answer) => boolean,
): Promise<{ answer: Answer; movedMs: number }> {
  const moved = { ms: 0, landed: false };
  const waiting = until(answers, wanted).finally(() => (moved.landed = true));

  while (!moved.landed) {
    await test.clock.advance(firstRetryMs);
    moved.ms += firstRetryMs;
    await settled(waiting);
  }

  return { answer: await waiting, movedMs: moved.ms };
}
