import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { expectMessage, messageLabel } from './new-session';

Given(
  'Agent {int} asks for an Elicitation',
  async ({ page, server }, ordinal: number): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      availability: 'available',
    });
  },
);

Then(
  'the Elicitation {string} opens over the Composer',
  async ({ page }, message: string): Promise<void> => {
    await expect(page.getByRole('dialog', { name: message })).toBeVisible();
    await expect(
      page
        .getByTestId('composer-column')
        .getByRole('textbox', { name: messageLabel, includeHidden: true }),
    ).toHaveCount(1);
  },
);

When(
  'I submit the Elicitation title {string}',
  async ({ page }, title: string): Promise<void> => {
    const form = page.getByRole('dialog', {
      name: 'A few details for the new issue',
    });
    await form.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await form.getByRole('button', { name: 'Submit', exact: true }).click();
  },
);

Then(
  'the Elicitation closes and the Composer accepts {string}',
  async ({ page }, draft: string): Promise<void> => {
    await expect(
      page.getByRole('dialog', { name: 'A few details for the new issue' }),
    ).toHaveCount(0);
    await page.getByRole('textbox', { name: messageLabel }).fill(draft);
    await expectMessage(page, draft);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeEnabled();
  },
);
