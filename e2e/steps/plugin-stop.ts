import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { navigation } from './plugins';
import { mutate } from './server-query';
import { toast } from './toasts';

// Turned off over HTTP, as another App or the CLI would, with the Plugin's page open here.
When(
  'the {} Plugin is turned off on the Server',
  async ({ page, app }, title: string): Promise<void> => {
    await mutate({
      page,
      httpUrl: app.httpUrl,
      procedure: 'plugin.setEnabled',
      input: { pluginId: title.toLowerCase(), enabled: false },
    });
  },
);

Then('the App returns to Sessions', async ({ page }): Promise<void> => {
  await expect(page).toHaveURL(/\/sessions$/);
});

Then(
  'the navigation no longer lists the {} Plugin',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      (await navigation(page)).getByRole('button', {
        name: title,
        exact: true,
      }),
    ).toHaveCount(0);
  },
);

Then(
  'a toast says the Plugin is not available',
  async ({ page }): Promise<void> => {
    await expect(toast(page, 'This Plugin is not available')).toBeVisible();
  },
);
