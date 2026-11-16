import type { Locator } from '@playwright/test';

// A hidden window paints no frames on Linux, so Playwright's stable check never ends; dispatch the click instead of waiting for paint.
export async function pressWithoutPaint(locator: Locator): Promise<void> {
  await locator.evaluate<void, void, HTMLElement>((el) => el.click());
}
