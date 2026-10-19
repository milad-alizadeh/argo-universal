import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent, readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';
import { expectMessage, messageLabel, sessionOpenTimeout } from './new-session';

const newSessionPath = '/sessions/new';

const configurationSignIn = 'Sign in to load configuration.';

const menuLabel = 'Authentication options';

const signInTerminal = 'Agent sign-in terminal';

// A callout's title is a heading; a phone draws it in a sheet, so these look in the whole page.
export const callout = (page: Page, title: string | RegExp): Locator =>
  page.getByRole('heading', { name: title, exact: typeof title === 'string' });

// These steps select scripted Agent behaviour; the Agent must be installed.
for (const fixture of [
  'Agent {int} needs sign-in',
  'Agent {int} exits while fetching configuration',
  'Agent {int} offers two sign-in methods',
  'Agent {int} holds its sign-in',
  'Agent {int} signs in through a terminal',
  'Agent {int} ends its first Turn needing sign-in',
  'Agent {int} ends its first Turn needing a terminal sign-in',
  'Agent {int} exits while opening its first Session',
])
  Given(fixture, expectListedAgent);

Then(
  'the App asks to authenticate to Agent {int} with {string}',
  async ({ page, server }, ordinal: number, method: string): Promise<void> => {
    const { name: label } = await readAgent(page, server.httpUrl, ordinal);
    await expect(
      page.url().endsWith(newSessionPath)
        ? page.getByText(configurationSignIn, { exact: true })
        : callout(page, `Authenticate to ${label}`),
    ).toBeVisible(sessionOpenTimeout);
    await expect(
      page.getByRole('button').filter({ hasText: method }),
    ).toBeVisible();
  },
);

Then(
  'the App offers the sign-in methods {string} then {string}',
  async ({ page }, first: string, second: string): Promise<void> => {
    await expect(
      page.getByText(configurationSignIn, { exact: true }),
    ).toBeVisible(sessionOpenTimeout);
    await expect(page.getByRole('button', { name: first })).toBeVisible();
    await page.getByRole('button', { name: menuLabel }).click();

    const options = page.getByRole('menuitemradio');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveAccessibleName(first);
    await expect(options.nth(1)).toHaveAccessibleName(second);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
  },
);

Then(
  'the sign-in says why it failed: {string}',
  async ({ page }, message: string): Promise<void> => {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  },
);

When(
  'I choose the sign-in method {string}',
  async ({ page }, method: string): Promise<void> => {
    await page.getByRole('button').filter({ hasText: method }).first().click();
  },
);

Then(
  'the App is authenticating to Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { name: label } = await readAgent(page, server.httpUrl, ordinal);
    await expect(
      page.url().endsWith(newSessionPath)
        ? page.getByText('Signing in…', { exact: true })
        : callout(page, `Authenticating to ${label}…`),
    ).toBeVisible();
  },
);

When('I cancel the sign-in', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

Then('the sign-in callout is gone', async ({ page }): Promise<void> => {
  await expect(callout(page, /^Authenticat(e|ing) to /)).toHaveCount(
    0,
    sessionOpenTimeout,
  );
  await expect(callout(page, 'Authentication Required')).toHaveCount(0);

  if (page.url().endsWith(newSessionPath))
    await expectConfigurationSignedIn(page);
});

Then(
  'the Message box still holds {string}',
  async ({ page }, prompt: string): Promise<void> => {
    // A phone's sign-in sheet hides the Composer below it from assistive technology.
    await expectMessage(page, prompt, onPhone(page));
  },
);

Then(
  'the sign-in terminal {string} is open',
  async ({ page }, title: string): Promise<void> => {
    await expect(page.getByRole('heading', { name: title })).toBeVisible(
      sessionOpenTimeout,
    );
    await expect(
      page
        .getByRole('region', { name: signInTerminal })
        .getByText('› Continue in your browser', { exact: true })
        // The terminal also lists its lines for screen readers.
        .first(),
    ).toBeAttached();
  },
);

When('I close the sign-in terminal', async ({ page }): Promise<void> => {
  await (onPhone(page)
    ? page.keyboard.press('Escape')
    : page.getByRole('button', { name: 'Close', exact: true }).click());

  await expect(page.getByRole('region', { name: signInTerminal })).toHaveCount(
    0,
  );
});

Then(
  'the Session says authentication is required: {string}',
  async ({ page }, description: string): Promise<void> => {
    await expect(callout(page, 'Authentication Required')).toBeVisible(
      sessionOpenTimeout,
    );
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    // The Feed and the Composer stay.
    await expect(
      page.getByRole('textbox', { name: messageLabel, includeHidden: true }),
    ).toBeAttached();
  },
);

When('I press Authenticate', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Authenticate', exact: true }).click();
});

When('I press Return in the sign-in terminal', async ({ page }) => {
  const terminal = page.getByRole('region', { name: 'Agent sign-in terminal' });
  await terminal.click();
  await terminal.getByRole('textbox').focus();
  await page.keyboard.press('Enter');
});

async function expectConfigurationSignedIn(page: Page): Promise<void> {
  await expect(
    page.getByText(configurationSignIn, { exact: true }),
  ).toHaveCount(0, sessionOpenTimeout);
  await expect(page.getByText('Signing in…', { exact: true })).toHaveCount(
    0,
    sessionOpenTimeout,
  );
  await page.keyboard.press('Escape');
}
