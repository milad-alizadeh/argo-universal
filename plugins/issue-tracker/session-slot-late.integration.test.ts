import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, vi } from 'vitest';
import { project, signedInRoot } from './journey-fixture';
import { attach, barSlot, itemsOf, watch } from './session-slot-fixture';

// The items one Session bar answer draws.
type Items = ReturnType<typeof itemsOf>;

// An Issue in its state colour; one with no state has no tone, which draws grey.
const inStateColour = expect.objectContaining({ tone: 'success' });

// Every answer the Session bar draws, in order; the loop ends when the test's watch is aborted.
function drawn(answers: ReturnType<typeof watch>): Items[] {
  const answered: Items[] = [];

  void (async (): Promise<void> => {
    for await (const answer of answers) answered.push(itemsOf(answer));
  })();

  return answered;
}

const coloured = (items: Items = []): boolean =>
  items.length > 0 &&
  items.every((item) => inStateColour.asymmetricMatch(item));

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

// The Issue tracker's own Operation that makes its Queries due, as any Operation run or change signal does.
const readAgain = async (test: PluginTest): Promise<void> => {
  await test.operations.run({
    name: 'checkAgain',
    params: {},
    caller: { projectId: project.id },
  });
};

// GitHub's slow answer takes real time; the Slot's 1.5 s budget runs on the Plugin clock, so the test moves it past.
const slowGithubMs = 2_000;

const pastSlotBudgetMs = 1_600;

// Real time for the slow answer to land and the Slot to draw again.
const landedMs = slowGithubMs + 1_000;

// Real time for the attach to reach the Slot before its budget runs out.
const attachedMs = 100;

it('keeps an Issue in its state colour while GitHub is slow to answer a read again', async () => {
  const { test, github } = await signedInRoot();
  const answers = drawn(watch(test, barSlot));

  await attach(test, 'attach');
  await vi.waitFor(() => expect(answers.some(coloured)).toBe(true));

  const loaded = answers.findIndex(coloured);

  github.delayIssues(slowGithubMs);
  await readAgain(test);
  await test.settled();
  await test.clock.advance(pastSlotBudgetMs);
  await sleep(landedMs);

  expect(answers.slice(loaded).every(coloured)).toBe(true);
}, 30_000);

it('colours an Issue once a first read that ran past the Slot budget lands', async () => {
  const { test, github } = await signedInRoot();
  const answers = drawn(watch(test, barSlot));

  github.delayIssues(slowGithubMs);
  await attach(test, 'attach');
  await sleep(attachedMs);
  await test.clock.advance(pastSlotBudgetMs);
  await sleep(landedMs);

  expect(coloured(answers.at(-1))).toBe(true);
}, 30_000);
