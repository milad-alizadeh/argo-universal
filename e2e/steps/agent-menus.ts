import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export async function closeAgentMenus(
  page: Page,
  agentModelLabel: string,
): Promise<void> {
  await page.mouse.move(0, 0);
  // Escape pops the Agent page, then closes Configure; each press waits for the button to settle.
  const trigger = page.getByRole('button', { name: agentModelLabel });

  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false', {
      timeout: 500,
    });
  }).toPass();
}
