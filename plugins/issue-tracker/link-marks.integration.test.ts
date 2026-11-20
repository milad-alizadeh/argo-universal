import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import { project, signedInRoot } from './journey-fixture';
import { until } from './session-slot-fixture';

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

  const contexts = [own, foreign].map((href) => ({
    href,
    projectId: project.id,
  }));

  const answers = test.slotItems(
    { slotId: markSlot, contexts },
    { signal: controller.signal },
  );

  onTestFinished(async () => {
    controller.abort();
    await answers.return(null);
  });

  return answers;
}

const sentFor = (answer: Answer, href: string): Answer[string][] => {
  const sent = answer[href];

  return sent ? [sent] : [];
};

const marksOf = (answer: Answer, href: string): unknown[] =>
  sentFor(answer, href).flatMap(({ items }) => items.map(({ item }) => item));

const hasOwnMark = (answer: Answer): boolean => marksOf(answer, own).length > 0;

it('marks a link to an Issue of the Project with its state, follows GitHub closing it, and leaves another repository alone', async () => {
  const { test, github } = await signedInRoot();
  const answers = watchMarks(test);

  const open = await until(answers, hasOwnMark);
  expect(marksOf(open, own)).toEqual([{ kind: 'issue', state: 'open' }]);
  expect(marksOf(open, foreign)).toEqual([]);

  github.closeIssue(42);
  /*
   * Leave the iterator parked on the open mark until both clocks have advanced.
   * A refresh read started during the advance can exhaust its worker budget.
   */
  await test.clock.advance(refreshMs);

  const closed = await until(answers, hasOwnMark);
  expect(marksOf(closed, own)).toEqual([{ kind: 'issue', state: 'closed' }]);
  expect(marksOf(closed, foreign)).toEqual([]);
}, 30_000);
