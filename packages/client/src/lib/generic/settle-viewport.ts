import { page } from 'vitest/browser';
const viewportHeight = 844;

export async function settleViewport(width: number): Promise<void> {
  await page.viewport(width, viewportHeight);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
