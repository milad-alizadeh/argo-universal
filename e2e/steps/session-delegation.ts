import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, Then, When } from './fixtures';
import { openSessionRow, openSessionUrl, sessionRow } from './live-session';
import { sessionOpenTimeout } from './new-session';

const parentTitle = 'Delegate the investigation';

const childTitle = 'Review delegated work';

Given('Agent {int} delegates work through the argo CLI', expectListedAgent);

// The fixture replies only after the supplied CLI has returned a successful settled result.
Then('the supplied CLI has started the delegated Session', async ({ page }) => {
  await expect(
    page
      .getByTestId('feed-scroll')
      .getByText('The delegated Session has started.', { exact: true }),
  ).toBeVisible(sessionOpenTimeout);
});

When('I return from the Session detail', async ({ page }) => {
  await page.getByRole('link', { name: 'Sessions, back' }).click();
});

When(
  "I open the delegated Agent from its caller's Agents card",
  async ({ page }) => {
    await openSessionRow(page, sessionRow(page, parentTitle), parentTitle);
    const callerUrl = page.url();

    await page.getByRole('button', { name: 'Agents: 1', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Agents', exact: true })
      .getByText(childTitle, { exact: true })
      .click();
    // The card's rows expose no pressed state, so the URL leaving the caller's Session is the only signal.
    const notOpened = `the delegated Agent "${childTitle}" did not open`;

    await expect(page, notOpened).toHaveURL(openSessionUrl);
    await expect(page, notOpened).not.toHaveURL(callerUrl);
  },
);

Then('the delegated Session accepts a new prompt', async ({ page }) => {
  const message = page.getByRole('textbox', { name: 'Message', exact: true });

  await expect(
    page.getByRole('heading', { name: childTitle, exact: true }),
  ).toBeVisible();
  await expect(message).toBeEditable();
  await message.fill('Continue the delegated review');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(message).toHaveText('');
  await expect(
    page.getByText('Continue the delegated review', { exact: true }),
  ).toBeVisible();
});

Then(
  'the delegated Session appears under its calling Session',
  async ({ page }) => {
    await expect(sessionRow(page, childTitle)).toBeVisible();
    const fold = page.getByRole('button', { name: parentTitle, exact: true });

    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await fold.click();
    await expect(sessionRow(page, childTitle)).toHaveCount(0);
    await fold.click();
    await expect(sessionRow(page, childTitle)).toBeVisible();
  },
);

Then(
  'the phone list preserves the delegated Session after its caller',
  async ({ page }) => {
    const rows = page.getByTestId('sessions-scroll').getByRole('button', {
      name: /^(Delegate the investigation|Review delegated work), /,
    });

    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAccessibleName(
      /^Delegate the investigation,/,
    );
    await expect(rows.nth(1)).toHaveAccessibleName(/^Review delegated work,/);
  },
);
