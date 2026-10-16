import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { closeAgentMenus } from './agent-menus';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone, openAppOnce, reloadApp } from './frame';

export const agentModelLabel = 'Agent and model';

export const messageLabel = 'Message';

// Opening a Session starts the Agent process, which outlasts the default 5s under parallel load.
export const sessionOpenTimeout = { timeout: 15_000 };

// New Session's empty Session is open and holds this device's last choices once the Agent/model spinner goes.
export async function waitForEmptySession(page: Page): Promise<void> {
  await expect(
    page.getByRole('progressbar', { name: 'Opening the Session' }),
  ).toHaveCount(0, sessionOpenTimeout);
}

// The text a Message box shows, whether it draws a plain text area or a rich-text editor.
export async function expectMessage(
  page: Page,
  text: string,
  includeHidden = false,
): Promise<void> {
  const box = page.getByRole('textbox', { name: messageLabel, includeHidden });

  const shown = (): Promise<string> =>
    box.evaluate((e) => ('value' in e ? String(e.value) : e.innerText.trim()));

  await expect.poll(shown).toBe(text);
}

export async function openNewSession(page: Page): Promise<void> {
  await openAppOnce(page);
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  // The Server runs on this computer, so New Session names no host; its Project shows once it is ready.
  await expect(page.getByRole('button', { name: /^Project: / })).toBeVisible();
  await expect(page.getByText('Reconnecting…')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: messageLabel })).toBeVisible();
}

export async function chooseAgent(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('button', { name: /^Agent,/ }).click();
  await page.getByRole('button', { name: `Select ${label}` }).click();
  await closeAgentMenus(page, agentModelLabel);
  await expectAgentSelection(page, label);
}

async function expectAgentSelection(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(page.getByRole('button', { name: /^Agent,/ })).toContainText(
    label,
  );
  await page.getByRole('button', { name: /^Agent,/ }).click();
  await expect(
    page.getByRole('button', { name: `Select ${label}` }),
  ).toHaveAttribute('aria-pressed', 'true');
  await closeAgentMenus(page, agentModelLabel);
}

async function startWithAgent(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<void> {
  const { label } = await readAgent(page, httpUrl, ordinal);
  await openNewSession(page);
  await chooseAgent(page, label);
  await waitForEmptySession(page);
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

// A phone's Sessions list is its own page at /sessions.
const sessionsListUrl = /\/sessions$/;

When('I return to the Sessions list', async ({ page }): Promise<void> => {
  await page.goBack();
  await expect(page).toHaveURL(sessionsListUrl);
});

When(
  'I reload the App and open New Session with Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await reloadApp(page);
    await startWithAgent(page, server.httpUrl, ordinal);
  },
);

// From New Session, the first prompt opens the Session.
export async function sendPrompt(page: Page, prompt: string): Promise<void> {
  await page.getByRole('textbox', { name: messageLabel }).fill(prompt);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/, sessionOpenTimeout);
  await expectMessage(page, '', true);
}

When(
  'I send the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await sendPrompt(page, prompt);
  },
);

// A phone goes back from the Session to its list; a wide Frame swapped New Session for the Session beside the list, so the Session stays and the list shows it.
async function backToSessions(page: Page): Promise<void> {
  if (onPhone(page)) {
    await page.goBack();
    await expect(page).toHaveURL(sessionsListUrl);
  } else await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
}

Then('Back returns to the Sessions list', async ({ page }): Promise<void> => {
  await backToSessions(page);
  await expect(
    // A phone shows the list as the page, a wide Frame in its sidebar.
    page.getByRole('heading', { name: 'Sessions', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No Sessions yet.', { exact: true })).toHaveCount(
    0,
  );
});

Given(
  'Agent {int} refuses to open/reopen a Session',
  async ({ page, server }, ordinal: number): Promise<void> => {
    // The refusal shows only when a Session opens or reopens, so the Agent is listed as available.
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
    ).toContainText("Couldn't open the Session", sessionOpenTimeout);
    await expect(page).toHaveURL(/\/sessions\/new$/);
  },
);

Then(
  'the Composer keeps the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await expectMessage(page, prompt);
  },
);
