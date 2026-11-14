import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { pullRequests, repository } from '../github-pulls';
import { Then, When } from './fixtures';

const fourth = pullRequests[3];

if (!fourth) throw new Error('The fixture needs four pull requests');

const workbench = (page: Page): Locator =>
  page.getByTestId('session-workbench');

const rows = (page: Page): Locator =>
  workbench(page).getByRole('button', { name: /^Open Change #\d+ on GitHub$/ });

Then(
  'the Workbench shows {int} pull request rows',
  async ({ page }, count: number): Promise<void> => {
    await expect(rows(page)).toHaveCount(count);
  },
);

When(
  'I press {string} in the Workbench',
  async ({ page }, name: string): Promise<void> => {
    await workbench(page).getByRole('button', { name, exact: true }).click();
  },
);

const openedUrls: string[] = [];

// The App opens a pull request through the window's opener; the scenario records the address and stays in the App.
When(
  "I press the fourth pull request's row",
  async ({ page }): Promise<void> => {
    openedUrls.length = 0;
    await page.exposeFunction('recordOpened', (url: string) => {
      openedUrls.push(url);
    });
    await page.evaluate(
      'window.open = (url) => { window.recordOpened(String(url)); return null; }',
    );
    // The row's own text presses the row; its Checks part opens the list of Checks instead.
    await workbench(page).getByText(fourth.title, { exact: true }).click();
  },
);

Then(
  "GitHub's page for the fourth pull request is opened",
  async ({ page }): Promise<void> => {
    await expect
      .poll(() => openedUrls)
      .toEqual([`https://github.com/${repository}/pull/${fourth.number}`]);
    expect(new URL(page.url()).hostname).not.toBe('github.com');
  },
);

Then(
  'the Inspector Changes tab is not open',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('tabpanel', { name: 'Changes', exact: true }),
    ).toHaveCount(0);
  },
);
