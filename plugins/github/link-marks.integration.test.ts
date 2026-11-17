import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import { attach, attributedRowItemsOf } from './journey-calls-fixture';
import { journey, project, type Journey } from './journey-fixture';
import { changePull, refreshed, repository } from './journey-watch-fixture';

const slow = 30_000;

const wait = 10_000;

const markSlot = 'argo/link/mark/v1';

const hrefOf = (number: number): string =>
  `https://github.com/${repository}/pull/${number}`;

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

const sentFor = (
  answer: Answer | undefined,
  href: string,
): Answer[string][] => {
  const sent = answer?.[href];

  return sent ? [sent] : [];
};

const itemsOf = (answer: Answer | undefined, href: string): unknown[] =>
  sentFor(answer, href).flatMap(({ items }) => items.map(({ item }) => item));

// The marks Argo would draw beside these links in a feed of the Project, by link; a link with none has an empty list.
async function marksOf(
  { test }: Journey,
  hrefs: readonly string[],
): Promise<Record<string, unknown[]>> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const answers = test.slotItems(
    {
      slotId: markSlot,
      contexts: hrefs.map((href) => ({ href, projectId: project.id })),
    },
    { signal: controller.signal },
  );

  const { value } = await answers.next();

  return Object.fromEntries(hrefs.map((href) => [href, itemsOf(value, href)]));
}

type Mark = { kind: 'pullRequest'; state: string };

const pullRequest = (state: string): Mark => ({ kind: 'pullRequest', state });

it(
  'marks a link to an attached pull request with the stage the Session row draws, and moves with it',
  async () => {
    const run = await journey();
    const href = hrefOf(7);

    changePull(run, 7, {});
    await attach(run, '#7');

    expect(await marksOf(run, [href])).toEqual({
      [href]: [pullRequest('open')],
    });

    changePull(run, 7, { state: 'closed', merged: true });
    await refreshed(run);

    expect(await marksOf(run, [href])).toEqual({
      [href]: [pullRequest('merged')],
    });
    expect(await attributedRowItemsOf(run)).toMatchObject([
      { item: { change: { stage: 'merged' } } },
    ]);
  },
  slow,
);

it(
  'reads a pull request no Session attached once its link is drawn, a draft as a draft, and answers no other link',
  async () => {
    const run = await journey();
    const draft = hrefOf(9);
    const comment = `${hrefOf(10)}#issuecomment-1`;
    const issue = `https://github.com/${repository}/issues/3`;

    changePull(run, 9, { draft: true });
    changePull(run, 10, { state: 'closed' });

    // Neither was ever read, so the first answer has no mark; GitHub is asked behind it.
    expect(await marksOf(run, [draft, comment, issue])).toEqual({
      [draft]: [],
      [comment]: [],
      [issue]: [],
    });

    await expect
      .poll(() => marksOf(run, [draft, comment, issue]), { timeout: wait })
      .toEqual({
        [draft]: [pullRequest('draft')],
        [comment]: [pullRequest('closed')],
        [issue]: [],
      });
  },
  slow,
);
