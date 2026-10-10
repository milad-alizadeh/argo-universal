import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';

const sessionSettingsLabel = 'Session settings';
export const agentModelLabel = 'Agent and model';
const openSessionLabel = 'Open Session';

export async function openNewSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  await expect(page.getByRole('img', { name: 'Connected' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: openSessionLabel, exact: true }),
  ).toBeVisible();
}

export async function chooseAgent(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
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

When(
  'I open another New Session with Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await startWithAgent(page, server.httpUrl, ordinal);
  },
);
When('I return to the Sessions list', async ({ page }): Promise<void> => {
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});
When(
  'I reload the App and open New Session with Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await page.goto(new URL('/', page.url()).href);
    await startWithAgent(page, server.httpUrl, ordinal);
  },
);
Given(
  'Agent {int} can inspect image prompts',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await startWithAgent(page, server.httpUrl, ordinal);
    await openSessionBeforePrompt(page);
  },
);

When(
  'I send the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    if (new URL(page.url()).pathname === '/sessions/new')
      await openSessionBeforePrompt(page);
    await page.getByRole('textbox', { name: 'Message' }).fill(prompt);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue(
      '',
    );
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

export async function openSessionBeforePrompt(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: openSessionLabel, exact: true })
    .click();
  await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
  await expect(
    page.getByRole('button', { name: 'Cancel creation' }),
  ).toBeVisible();
}
When('I open the Session before prompting', async ({ page }): Promise<void> => {
  await openSessionBeforePrompt(page);
});
When('I enable Fast mode', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: sessionSettingsLabel }).click();
  await page.getByRole('button', { name: 'Fast mode', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: sessionSettingsLabel }).click();
  await expect(
    page.getByRole('button', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
});
Then('Fast mode remains enabled', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: sessionSettingsLabel }).click();
  await expect(
    page.getByRole('button', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
When('I cancel Session creation', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Cancel creation' }).click();
});
Then('the Sessions list is shown', async ({ page }): Promise<void> => {
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
  ).toBeVisible();
});
