import { page } from 'vitest/browser';

const viewportHeight = 844;

// With Reanimated 4.7 a resize's layout lands shortly after the second frame; clicking sooner misses the phone layout.
const RESIZE_SETTLE_MS = 100;

export async function settleViewport(width: number): Promise<void> {
  await page.viewport(width, viewportHeight);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, RESIZE_SETTLE_MS));
}
