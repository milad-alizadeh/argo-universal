import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';

export const agentModelLabel = 'Agent and model';
export const messageLabel = 'Message';
const checkedAttribute = 'aria-checked';

export async function openNewSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  // The Server runs on this computer, so New Session names no host; its Project shows once it is ready.
  await expect(page.getByRole('button', { name: /^Project: / })).toBeVisible();
  await expect(page.getByText('Reconnecting…')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: messageLabel })).toBeVisible();
}

export async function chooseAgent(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('button', { name: 'Choose Agent' }).click();
  await page.getByRole('button', { name: `Select ${label}` }).click();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: agentModelLabel }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: agentModelLabel }).click();
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
// From New Session, the first prompt opens the Session.
export async function sendPrompt(page: Page, prompt: string): Promise<void> {
  await page.getByRole('textbox', { name: messageLabel }).fill(prompt);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
  await expect(page.getByRole('textbox', { name: messageLabel })).toHaveValue(
    '',
  );
}

When(
  'I send the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await sendPrompt(page, prompt);
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

When('I enable Fast mode', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('switch', { name: 'Fast mode', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(
    page.getByRole('switch', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute(checkedAttribute, 'true');
  await page.keyboard.press('Escape');
});
Then('Fast mode remains enabled', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(
    page.getByRole('switch', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute(checkedAttribute, 'true');
  await page.keyboard.press('Escape');
});

Given(
  'Agent {int} refuses to open a Session',
  async ({ page, server }, ordinal: number): Promise<void> => {
    // The refusal shows only when a Session opens, so the Agent is listed as available.
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      availability: 'available',
    });
  },
);

When(
  'I try to send the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await page.getByRole('textbox', { name: messageLabel }).fill(prompt);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
  },
);

Then(
  "New Session says the Session couldn't open",
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('region', { name: /^Notifications/ }),
    ).toContainText("Couldn't open the Session");
    await expect(page).toHaveURL(/\/sessions\/new$/);
  },
);

Then(
  'the Composer keeps the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await expect(page.getByRole('textbox', { name: messageLabel })).toHaveValue(
      prompt,
    );
  },
);
