import { rename, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { When } from './fixtures';

const connectSecondApp = async (page: Page, httpUrl: string): Promise<void> => {
  await page.addInitScript(
    (url): void => {
      Object.assign(globalThis, { argo: { serverUrl: url } });
    },
    httpUrl.replace(/^http/, 'ws'),
  );
};
const releaseSuccessfulRetry = async (path: string): Promise<void> => {
  await writeFile(
    `${path}.next`,
    JSON.stringify({ outcome: 'success', released: true }),
  );
  await rename(`${path}.next`, path);
};
const confirmInstall = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Install Example Agent?' })
    .getByRole('button', { name: 'Install', exact: true })
    .click();
};
async function retryInApp(page: Page, httpUrl: string): Promise<void> {
  await connectSecondApp(page, httpUrl);
  await page.goto('/');
  await browseAgents(page);
  await page.getByRole('link', { name: /^Example Agent,/ }).click();
  await confirmInstall(page);
  await expect(
    page
      .getByRole('region', { name: /^Notifications/ })
      .getByText('Example Agent installed', { exact: true }),
  ).toBeVisible();
}
// The installed Agent leaves the registry offer: no Install action and no registry source.
const showsInstalled = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('button', { name: /^Install(ing…)?$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('group', { name: 'Source, ACP Registry' }),
  ).toHaveCount(0);
};
When(
  'another App retries and both Apps show the installed release',
  async ({ page, app }): Promise<void> => {
    await releaseSuccessfulRetry(app.installationPath);
    const second = await page.context().newPage();
    try {
      await retryInApp(second, app.httpUrl);
      await showsInstalled(second);
      await showsInstalled(page);
    } finally {
      await second.close();
    }
  },
);
