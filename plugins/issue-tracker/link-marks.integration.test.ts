import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import { project, signedInRoot } from './journey-fixture';

const markSlot = 'argo/link/mark/v1';

const own = 'https://github.com/owner/repository/issues/42';

// The same number in a repository the Project's Tracker does not read.
const foreign = 'https://github.com/other/repository/issues/42';

const refreshMs = 30_000;

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

// The marks Argo would redraw a feed's links with, each time a Plugin says they changed.
function watchMarks(test: PluginTest): AsyncGenerator<Answer> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const contexts = [own, foreign].map((href) => ({
    href,
    projectId: project.id,
  }));

  return test.slotItems(
    { slotId: markSlot, contexts },
    { signal: controller.signal },
  );
}

const sentFor = (answer: Answer, href: string): Answer[string][] => {
  const sent = answer[href];

  return sent ? [sent] : [];
};

const marksOf = (answer: Answer, href: string): unknown[] =>
  sentFor(answer, href).flatMap(({ items }) => items.map(({ item }) => item));

it('marks a link to an Issue of the Project with its state, follows GitHub closing it, and leaves another repository alone', async () => {
  const { test, github } = await signedInRoot();
  const answers = watchMarks(test);
  let latest: Answer = {};

  void (async (): Promise<void> => {
    for await (const answer of answers) latest = answer;
  })();

  // The Issue was never read, so its mark arrives once the Tracker has answered behind the first ask.
  await expect
    .poll(() => marksOf(latest, own), { timeout: 5000 })
    .toEqual([{ kind: 'issue', state: 'open' }]);
  expect(marksOf(latest, foreign)).toEqual([]);

  github.closeIssue(42);
  await test.clock.advance(refreshMs);

  await expect
    .poll(() => marksOf(latest, own), { timeout: 5000 })
    .toEqual([{ kind: 'issue', state: 'closed' }]);
  expect(marksOf(latest, foreign)).toEqual([]);
}, 30_000);
