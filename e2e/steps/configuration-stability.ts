import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { requests } from './agent-requests';
import { When, Then } from './fixtures';

When(
  'I adjust effort without the configuration disappearing',
  async ({ page }) => {
    const slider = await openEffort(page);
    const original = await slider.elementHandle();
    await adjustToLow(page, slider);
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

const trigger = (page: Page): Locator =>
  page.getByRole('button', { name: 'Agent and model' });

async function openEffort(page: Page): Promise<Locator> {
  await trigger(page).click();
  const slider = page.getByRole('slider', { name: 'Effort' });
  await expect(slider).toBeVisible();
  await slider.focus();

  return slider;
}

async function adjustToLow(page: Page, slider: Locator): Promise<void> {
  await page.keyboard.press('End');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Low');
  // The trigger shows the applied effort, so a Session's Server round trip has ended before the next adjustment.
  await expect(trigger(page)).toContainText('Low');
  await expect(slider).toBeFocused();
}
