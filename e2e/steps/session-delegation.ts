import { expect } from '../fixtures';
import { Given, Then } from './fixtures';
import { sessionRow } from './live-session';

const parentTitle = 'Delegate the investigation';

const childTitle = 'Review delegated work';

Given('Agent 1 delegates work through the argo CLI', () => {
  // scenarioAgents supplies the external fixture Agent before the App starts.
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
