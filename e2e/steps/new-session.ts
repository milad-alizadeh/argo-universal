import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone, openAppOnce, reloadApp } from './frame';

export const agentModelLabel = 'Agent and model';

export const messageLabel = 'Message';

// Opening a Session starts the Agent process, which outlasts the default 5s under parallel load.
export const sessionOpenTimeout = { timeout: 15_000 };

// Loading appears only when the Server has no saved options.
export const openingLabel = 'Loading configuration…';

// Loading is gone: nothing is reading options for an Agent without cached ones.
export async function waitForEmptySession(page: Page): Promise<void> {
  await openConfiguration(page);
  await expect(
    page.getByRole('progressbar', { name: /Loading configuration|Installing/ }),
  ).toHaveCount(0, sessionOpenTimeout);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: agentModelLabel }),
  ).toBeHidden();
}

// The text a Message box shows, whether it draws a plain text area or a rich-text editor.
export async function expectMessage(
  page: Page,
  text: string,
  includeHidden = false,
): Promise<void> {
  const box = page.getByRole('textbox', { name: messageLabel, includeHidden });

  const shown = (): Promise<string> =>
    box.evaluate<string, void, HTMLElement>((e) =>
      'value' in e ? String(e.value) : e.innerText.trim(),
    );

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

export async function chooseLocalCheckout(page: Page): Promise<void> {
  const checkout = page.getByRole('button', { name: 'Checkout' });
  await expect(checkout).toContainText('New worktree');
  await expect(checkout).not.toContainText('main');
  await checkout.click();
  await page.getByRole('radio', { name: 'Local' }).click();
  // Checkout selection changes the next Send; it opens no Session.
  await expect(
    page.getByRole('button', { name: 'Checkout', includeHidden: true }),
  ).toHaveText(/Local/);
}

export async function openConfiguration(page: Page): Promise<void> {
  if (await page.getByRole('dialog', { name: agentModelLabel }).isVisible())
    return;
  await page.getByRole('button', { name: agentModelLabel }).click();
}

// The Agent page: a pushed page inside Configure, with its own heading.
function selectAgentPage(page: Page): Locator {
  return page
    .getByRole('dialog', { name: 'Agent', exact: true })
    .or(page.getByRole('heading', { name: 'Agent', exact: true }));
}

export async function chooseAgent(page: Page, label: string): Promise<void> {
  await openConfiguration(page);
  await page.getByRole('button', { name: /^Agent(?:,|$)/ }).click();
  await page.getByRole('radio', { name: label, exact: true }).click();
  await expect(selectAgentPage(page)).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /^Agent(?:,|$)/ }),
  ).toContainText(label);
}

When('I open the configuration picker', async ({ page }) =>
  openConfiguration(page),
);

async function startWithAgent(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<void> {
  const { name: label } = await readAgent(page, httpUrl, ordinal);
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
      id: expect.any(String),
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

When('I open a New Session', async ({ page }) => openNewSession(page));
