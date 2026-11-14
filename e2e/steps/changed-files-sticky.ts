import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { checkoutPath } from './archive';
import { Given, Then, When } from './fixtures';

const execute = promisify(execFile);

// A Checkout's spread of file lengths, so diffs land above the reader while the list is scrolled.
const fileLines = [
  12, 40, 150, 8, 60, 30, 16, 100, 15, 22, 11, 100, 10, 37, 18, 17, 250, 14, 14,
  45, 6, 75,
];

const lines = (count: number, text: string): string =>
  Array.from({ length: count }, (_, line) => `${text} ${line}\n`).join('');

const changedPath = (index: number): string => `changed/file-${index}.txt`;

async function writeAll(cwd: string, text: string): Promise<void> {
  await Promise.all(
    fileLines.map((count, index) =>
      writeFile(path.join(cwd, changedPath(index)), lines(count, text)),
    ),
  );
}

const gitAuthor = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

Given('the Project has many files of different lengths', async ({ app }) => {
  const cwd = app.projectPath;

  await mkdir(path.join(cwd, 'changed'), { recursive: true });
  await writeFile(path.join(cwd, 'greeting.txt'), 'Hello world\n');
  await writeAll(cwd, 'old');
  await execute('git', ['add', '.'], { cwd });
  await execute('git', [...gitAuthor, 'commit', '-qm', 'Files'], { cwd });
  await execute('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd,
  });
});

When("the Session's Checkout changes every file", async ({ app }) => {
  await writeAll(checkoutPath(app), 'new');
});

When('I open the many changed files', async ({ page }) => {
  await page
    .getByTestId('session-workbench')
    .getByRole('button', { name: 'Open Changes overview' })
    .click();
  await expect(fileHeader(page, 0)).toBeVisible();
});

const fileHeader = (page: Page, index: number): Locator =>
  page.getByRole('button', { name: `Diff for ${changedPath(index)}` });

interface ListScroll {
  scroll: number;
  max: number;
  top: number;
}

const readScroll = (page: Page): Promise<ListScroll> =>
  page.getByTestId('changes-files').evaluate((list): ListScroll => {
    const scroller = [list, ...list.querySelectorAll('*')].find(
      (element) => element.scrollHeight > element.clientHeight + 50,
    );

    if (!scroller) throw new Error('Changed files do not scroll');

    return {
      scroll: scroller.scrollTop,
      max: scroller.scrollHeight - scroller.clientHeight,
      top: scroller.getBoundingClientRect().top,
    };
  });

/*
 * Whether a drawn file header's row covers the list's top edge; the list's top padding is 12. The row, not its toggle:
 * a header being pushed off by the next one still covers the top with its lower part. The list draws each header in a
 * cell with an inline z-index.
 */
const headerIsStuck = (page: Page, top: number): Promise<boolean> =>
  page.getByRole('button', { name: /^Diff for / }).evaluateAll(
    (headers, listTop) =>
      headers.some((header) => {
        const row = header.closest('[style*="z-index"]') ?? header;
        const box = row.getBoundingClientRect();

        return box.top - listTop <= 12 && box.bottom > listTop;
      }),
    top,
  );

const nextFrame = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );

// One wheel step; answers with where the list landed if no header is stuck past its top.
async function wheelStep(page: Page, by: number): Promise<number[]> {
  await page.mouse.wheel(0, by);
  await nextFrame(page);
  const { scroll, top } = await readScroll(page);

  return scroll > 80 && !(await headerIsStuck(page, top)) ? [scroll] : [];
}

async function wheel(
  page: Page,
  by: number,
  done: (place: ListScroll) => boolean,
): Promise<number[]> {
  const missing: number[] = [];

  while (!done(await readScroll(page)))
    missing.push(...(await wheelStep(page, by)));

  return missing;
}

// Back up a wheel's step at a time is slow, so this is as far as a CI runner has time for: several files' worth.
const upReach = 25_000;

Then(
  "a file's header is at the top of the list on the way down and back up",
  async ({ page }) => {
    test.setTimeout(300_000);
    await page.getByTestId('changes-files').hover();

    expect(
      await wheel(page, 240, ({ scroll, max }) => scroll >= max - 1),
    ).toEqual([]);
    const { scroll: bottom } = await readScroll(page);

    expect(
      await wheel(page, -80, ({ scroll }) => scroll <= bottom - upReach),
    ).toEqual([]);
  },
);
