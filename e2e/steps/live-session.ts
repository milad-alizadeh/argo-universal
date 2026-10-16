import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { wide, wideFrame } from './frame';
import { agentModelLabel, openNewSession, sendPrompt } from './new-session';

export const liveTitle = 'Check the live list';

export const attentionLabel = '1 Session needs attention';

// A Session's row in the list, named by its title and status.
export const sessionWithStatus = (
  page: Page,
  title: string,
  status: string,
): Locator =>
  page.getByRole('button', { name: `${title}, ${status}`, exact: true });

const escapeRegExp = (text: string): string =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A Session's row in the list, named by its title, whatever its status.
export const sessionRow = (page: Page, title: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}, `) });

export function liveSessionRow(page: Page): Locator {
  return sessionRow(page, liveTitle);
}

export async function startSession(page: Page, title: string): Promise<void> {
  await openNewSession(page);
  await sendPrompt(page, title);
}

When(
  'I start a Session named {string} that waits for input',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 2, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId(wideFrame)).toBeVisible();
    await startSession(page, title);
    await expect(sessionWithStatus(page, title, 'Needs input')).toBeVisible();
  },
);

Given(
  'a Session named {string}',
  async ({ page }, title: string): Promise<void> => {
    await page.setViewportSize(wide);
    await startSession(page, title);
    // Its Turn ended while the reader watched the end of its Feed.
    await expect(sessionWithStatus(page, title, 'Idle')).toBeVisible();
  },
);

Then(
  'the Sessions list shows the unread Session with one attention badge',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toBeVisible();
    await expect(sessionWithStatus(page, liveTitle, 'Unread')).toBeVisible();
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

const chooseModelLabel = /^Model,/;

const effortValueAttribute = 'aria-valuetext';

async function chooseEffort(page: Page, effort: string): Promise<void> {
  const slider = page.getByRole('slider', { name: 'Effort' });
  await slider.focus();
  await slider.press('Home');

  if ((await slider.getAttribute(effortValueAttribute)) !== effort)
    await slider.press('End');
}

async function reopenConfiguration(page: Page): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Select Model' })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: agentModelLabel }).click();
}

When(
  'I choose model {string} and effort {string}',
  async ({ page }, model: string, effort: string): Promise<void> => {
    await page.getByRole('button', { name: agentModelLabel }).click();
    await page.getByRole('button', { name: chooseModelLabel }).click();
    await page.getByRole('radio', { name: model, exact: true }).click();
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
