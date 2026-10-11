import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { phone, wide } from './frame';
import { agentModelLabel, openNewSession, sendPrompt } from './new-session';

export const liveTitle = 'Check the live list';
export const attentionLabel = '1 Session needs attention';

export function liveSessionRow(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^${liveTitle}, `) });
}

export async function startSession(page: Page, title: string): Promise<void> {
  await openNewSession(page);
  await sendPrompt(page, title);
}

When(
  'I start a Session named {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('desktop-shell')).toBeVisible();
    await startSession(page, title);
  },
);

Given(
  'a Session named {string}',
  async ({ page }, title: string): Promise<void> => {
    await page.setViewportSize(wide);
    await startSession(page, title);
    await expect(
      page.getByRole('button', { name: `${title}, Unread`, exact: true }),
    ).toBeVisible();
  },
);

Given('an unread Session in a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(wide);
  await startSession(page, liveTitle);
  await expect(
    page.getByRole('button', { name: `${liveTitle}, Unread`, exact: true }),
  ).toBeVisible();
  await page.setViewportSize(phone);
  await page.getByRole('link', { name: /back/i }).click();
});

Then(
  'the Sessions list shows the unread Session with one attention badge',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: `${liveTitle}, Unread`, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveText(
      '1',
    );
  },
);

Then(
  'the live Session remains in the list',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toBeVisible();
  },
);

const chooseModelLabel = 'Choose model';
const effortValueAttribute = 'aria-valuetext';
async function chooseEffort(page: Page, effort: string): Promise<void> {
  const slider = page.getByRole('slider', { name: 'Effort' });
  await slider.focus();
  await slider.press('Home');
  if ((await slider.getAttribute(effortValueAttribute)) !== effort)
    await slider.press('End');
}

async function reopenConfiguration(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: agentModelLabel }).click();
}

When(
  'I choose model {string} and effort {string}',
  async ({ page }, model: string, effort: string): Promise<void> => {
    await page.getByRole('button', { name: agentModelLabel }).click();
    await page.getByRole('button', { name: chooseModelLabel }).click();
    await page.getByRole('button', { name: model, exact: true }).click();
    await reopenConfiguration(page);
    await expectModel(page, model);
    await chooseEffort(page, effort);
    await reopenConfiguration(page);
    await expectEffort(page, effort);
    await page.keyboard.press('Escape');
  },
);
Then(
  'the configuration shows model {string} and effort {string}',
  async ({ page }, model: string, effort: string): Promise<void> => {
    await page.getByRole('button', { name: agentModelLabel }).click();
    await expectModel(page, model);
    await expectEffort(page, effort);
    await page.keyboard.press('Escape');
  },
);

async function expectModel(page: Page, model: string): Promise<void> {
  await expect(
    page.getByRole('button', { name: chooseModelLabel }),
  ).toContainText(model);
}
async function expectEffort(page: Page, effort: string): Promise<void> {
  await expect(page.getByRole('slider', { name: 'Effort' })).toHaveAttribute(
    effortValueAttribute,
    effort,
  );
}
