import { expect, waitFor } from 'storybook/test';
import { fadedEdges } from '../scroll-fade';

export async function expectScrollsUnderFades(
  scroll: HTMLElement,
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  await expectInitialFades(scroll);
  scroll.scrollTop = scroll.scrollHeight;
  const item = await resolveLastRow(last);
  await waitFor(() => expectRowInsideScroll(scroll, item));
  await waitFor(() =>
    expect(fadedEdges(scroll)).toEqual({ top: true, bottom: false }),
  );

  // A virtualized list may recycle the row while it scrolls, so find it again once it settles.
  return resolveLastRow(last);
}

async function expectRowInsideScroll(
  scroll: HTMLElement,
  item: HTMLElement,
): Promise<void> {
  scroll.scrollTop = scroll.scrollHeight;
  const box = item.getBoundingClientRect();
  const viewport = scroll.getBoundingClientRect();
  await expect(box.top).toBeGreaterThanOrEqual(viewport.top);
  await expect(box.bottom).toBeLessThanOrEqual(viewport.bottom);
}

async function resolveLastRow(
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  return typeof last === 'function' ? last() : last;
}

// It overflows, and only its bottom edge hides content.
async function expectInitialFades(scroll: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
  );
  await waitFor(() =>
    expect(fadedEdges(scroll)).toEqual({ top: false, bottom: true }),
  );
}
