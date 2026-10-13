import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export async function closeAgentMenus(
  page: Page,
  agentModelLabel: string,
): Promise<void> {
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Select Agent' })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: agentModelLabel }),
  ).toHaveAttribute('aria-expanded', 'false');
}
