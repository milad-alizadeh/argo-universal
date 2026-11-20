import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent, readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';
import { expectMessage, sessionOpenTimeout } from './new-session';

const newSessionPath = '/sessions/new';

const configurationSignIn = 'Sign in to load configuration.';

// A callout's title is a heading; a phone draws it in a sheet, so these look in the whole page.
export const callout = (page: Page, title: string | RegExp): Locator =>
  page.getByRole('heading', { name: title, exact: typeof title === 'string' });

// These steps select scripted Agent behaviour; the Agent must be installed.
for (const fixture of ['Agent {int} needs sign-in'])
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

When(
  'I choose the sign-in method {string}',
  async ({ page }, method: string): Promise<void> => {
    await page.getByRole('button').filter({ hasText: method }).first().click();
  },
);

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
