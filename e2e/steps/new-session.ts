import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';

export async function openNewSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  await expect(page.getByRole('img', { name: 'Connected' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
}

export async function chooseAgent(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Agent and model' }).click();
  await page.getByRole('button', { name: 'Choose Agent' }).click();
  await page.getByRole('button', { name: `Select ${label}` }).click();
  await expect(
    page.getByRole('button', { name: 'Choose Agent' }),
  ).toContainText(label);
  await page.keyboard.press('Escape');
}

async function startWithAgent(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<void> {
  const { label } = await readAgent(page, httpUrl, ordinal);
  await openNewSession(page);
  await chooseAgent(page, label);
}

Given(
  'a New Session with Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await startWithAgent(page, server.httpUrl, ordinal);
  },
);

Given(
  'Agent {int} can inspect image prompts',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await startWithAgent(page, server.httpUrl, ordinal);
  },
);

When(
  'I send the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await page.getByRole('textbox', { name: 'Message' }).fill(prompt);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
  },
);

Then('Back returns to the Sessions list', async ({ page }): Promise<void> => {
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No Sessions yet.', { exact: true })).toHaveCount(
    0,
  );
});
