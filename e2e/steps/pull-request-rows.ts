import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then } from './fixtures';

const rows = (page: Page): Locator =>
  page
    .getByTestId('session-workbench')
    .getByRole('button', { name: /^Open Change #\d+ on GitHub$/ });

Then(
  'the Workbench shows {int} pull request rows',
  async ({ page }, count: number): Promise<void> => {
    await expect(rows(page)).toHaveCount(count);
  },
);
