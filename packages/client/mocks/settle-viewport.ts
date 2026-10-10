import { page } from 'vitest/browser';
export async function settleViewport(width: number): Promise<void> {
  await page.viewport(width, 844);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
