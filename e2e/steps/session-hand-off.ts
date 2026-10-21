import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { sendPrompt } from './new-session';

const historyLength = 'history.length';

// The history length before the first prompt, read after it to show no page was added.
const historyBefore = new WeakMap<Page, number>();

const composerWidthBefore = new WeakMap<Page, number>();

// Notes whether the sent prompt, once in a Feed, ever leaves it while New Session becomes the Session.
const watchPrompt = (prompt: string): string => `{
  const watch = (window.promptWatch = { seen: false, dropped: false });
  const shown = () =>
    [...document.querySelectorAll('[data-testid="feed-column"]')].some(
      (column) => column.textContent.includes(${JSON.stringify(prompt)}),
    );
  new MutationObserver(() => {
    if (shown()) watch.seen = true;
    else if (watch.seen) watch.dropped = true;
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}`;

When(
  'I send the first prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    historyBefore.set(page, await page.evaluate<number>(historyLength));

    const composer = await page
      .getByRole('textbox', { name: 'Message' })
      .boundingBox();

    if (!composer) throw new Error('The Composer is not visible');
    composerWidthBefore.set(page, composer.width);
    await page.evaluate(watchPrompt(prompt));
    await sendPrompt(page, prompt);
  },
);

Then(
  'New Session became that Session in place with the prompt shown throughout',
  async ({ page }): Promise<void> => {
    await expectComposerWidth(page);
    const url = new URL(page.url());
    expect({
      path: /^\/sessions\/[\da-f-]{36}$/.test(url.pathname),
      search: url.search,
      history: await page.evaluate<number>(historyLength),
      watch: await page.evaluate<unknown>('window.promptWatch'),
    }).toEqual({
      path: true,
      search: '',
      history: historyBefore.get(page),
      watch: { seen: true, dropped: false },
    });
  },
);

async function expectComposerWidth(page: Page): Promise<void> {
  const composer = await page
    .getByRole('textbox', { name: 'Message' })
    .boundingBox();

  const before = composerWidthBefore.get(page);

  if (!composer || before === undefined)
    throw new Error('The Composer width was not recorded');

  expect(composer.width).toBeCloseTo(before, 2);
}
