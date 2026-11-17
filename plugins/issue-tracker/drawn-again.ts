import type { OpenPage } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';

/*
 * A page drawn again is served what it last read while the read it is due runs behind it, and is marked to draw
 * again once that read answers differently (ADR-0060), so it is drawn until it shows `text`.
 */
export async function drawnUntil(page: OpenPage, text: string): Promise<void> {
  await expect
    .poll(async () => {
      await page.draw();

      return page.findText(text) !== undefined;
    })
    .toBe(true);
}
