import { rename, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { When } from './fixtures';
import { connectSecondApp } from './second-app';

const releaseSuccessfulRetry = async (path: string): Promise<void> => {
  await writeFile(
    `${path}.next`,
    JSON.stringify({ outcome: 'success', released: true }),
  );
  await rename(`${path}.next`, path);
};
async function retryInApp(page: Page, httpUrl: string): Promise<void> {
  await connectSecondApp(page, httpUrl);
  await page.goto('/');
  await browseAgents(page);
  await page.getByRole('link', { name: /^Example Agent,/ }).click();
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Example Agent installed',
  );
}
When(
  'another App retries and both Apps show the installed release',
  async ({ page, app }): Promise<void> => {
    await releaseSuccessfulRetry(app.installationPath);
    const second = await page.context().newPage();
    try {
      await retryInApp(second, app.httpUrl);
      await expect(page.getByRole('dialog')).toContainText(
        'Example Agent installed',
      );
    } finally {
      await second.close();
    }
  },
);
