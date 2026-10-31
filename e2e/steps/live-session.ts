import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { onPhone, wide, wideFrame } from './frame';
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

export const sessionRow = (page: Page, title: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}, `) });

// An archived Session's row: its name ends on Archived, the state its lanes draw as a pill beside the press target.
export const archivedSessionRow = (page: Page, title: string): Locator =>
  sessionRow(page, title).and(
    page.getByRole('button', { name: /, Archived$/ }),
  );

export const openSessionUrl = /\/sessions\/(?!new)[^/]+$/;

// A swallowed row press leaves the App where it was, so name the press before the destination is blamed.
export async function openSessionRow(
  page: Page,
  row: Locator,
  title: string,
): Promise<void> {
  await row.click();

  const notOpened = `the Session "${title}" did not open`;

  await expect(page, notOpened).toHaveURL(openSessionUrl);

  // A phone's page covers the list, so only the URL is left to check there.
  if (!onPhone(page)) {
    await expect(row, notOpened).toHaveAttribute('aria-pressed', 'true');
  }
}

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

// The Effort slider names itself and speaks its level; Configure must be open.
const effortSlider = (page: Page): Locator =>
  page.getByRole('slider', { name: 'Effort' });

async function chooseEffort(page: Page, effort: string): Promise<void> {
  const slider = effortSlider(page);
  await slider.focus();
  await slider.press('Home');

  if ((await slider.getAttribute('aria-valuetext')) !== effort)
    await slider.press('End');
}

// The Model page closes itself when a model is chosen and Configure stays open; Escape then closes Configure.
async function reopenConfiguration(page: Page): Promise<void> {
  await expect(
    page.getByRole('dialog', { name: 'Model', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: agentModelLabel })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: agentModelLabel }).click();
}

// Leaves the configuration open on the chosen model.
async function chooseModel(page: Page, model: string): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('button', { name: chooseModelLabel }).click();
  await page.getByRole('radio', { name: model, exact: true }).click();
  await reopenConfiguration(page);
  await expectModel(page, model);
}

When(
  'I choose model {string}',
  async ({ page }, model: string): Promise<void> => {
    await chooseModel(page, model);
    await page.keyboard.press('Escape');
  },
);

When(
  'I choose model {string} and effort {string}',
  async ({ page }, model: string, effort: string): Promise<void> => {
    await chooseModel(page, model);
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
  await expect(effortSlider(page)).toHaveAttribute('aria-valuetext', effort);
}
