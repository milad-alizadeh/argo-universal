import { expect } from '../fixtures';
import { requests } from './agent-requests';
import { When, Then } from './fixtures';

When(
  'I adjust effort without the configuration disappearing',
  async ({ page }) => {
    await page.getByRole('button', { name: 'Agent and model' }).click();
    const slider = page.getByRole('slider', { name: 'Effort' });
    await expect(slider).toBeVisible();
    const original = await slider.elementHandle();
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Low');
    // A second keyboard adjustment must still reach the same focused slider.
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuetext', 'High');
    expect(await original?.evaluate((element) => element.isConnected)).toBe(
      true,
    );
  },
);

Then('configuration discovery has not sent a prompt', async ({ app }) => {
  expect(requests(app.requestLogPath, 'session/prompt')).toHaveLength(0);
});
