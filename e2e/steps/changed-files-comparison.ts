import { expect } from '../fixtures';
import { openChangedFiles } from './changed-files';
import { When } from './fixtures';
import { onPhone } from './frame';

When('I compare the changed files against remote main', async ({ page }) => {
  const comparison = page.getByRole('button', {
    name: 'Comparison',
    exact: true,
  });

  if (onPhone(page)) await openChangedFiles(page);

  await comparison.click();
  await page
    .getByRole('menuitemradio', { name: 'Compare Against', exact: true })
    .click();
  await page.getByRole('radio', { name: 'origin/main', exact: true }).click();
  await expect(comparison).toContainText('Compare Against origin/main');
});
