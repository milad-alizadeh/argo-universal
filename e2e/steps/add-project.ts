import { expect } from '../fixtures';
import { When, Then } from './fixtures';

When(
  'I add the fixture folder as a Project from Get started',
  async ({ app, page }): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Add a Project' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Add Project', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Folder' }).fill(app.projectPath);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  },
);

Then(
  'Get started no longer asks for a Project',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Add a Project' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Agent Setup' }),
    ).toHaveCount(0);
  },
);
