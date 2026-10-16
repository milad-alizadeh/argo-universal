import { expect, waitFor, within } from 'storybook/test';
import { fadedEdges } from '../scroll-fade';

export async function expectScrollsUnderFades(
  scroll: HTMLElement,
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  await expectInitialFades(scroll);
  const item = await scrollToLastRow(scroll, last);
  await waitFor(() => expectRowInsideScroll(scroll, item));
  await waitFor(() =>
    expect(fadedEdges(scroll)).toEqual({ top: true, bottom: false }),
  );

  // A virtualized list may recycle the row while it scrolls, so find it again once it settles.
  return resolveLastRow(last);
}

export async function expectRowInsideScroll(
  scroll: HTMLElement,
  item: HTMLElement,
): Promise<void> {
  scroll.scrollTop = scroll.scrollHeight;
  const box = item.getBoundingClientRect();
  const viewport = scroll.getBoundingClientRect();
  await expect(box.top).toBeGreaterThanOrEqual(viewport.top);
  await expect(box.bottom).toBeLessThanOrEqual(viewport.bottom);
}

export async function lastVisible(name: string): Promise<HTMLElement> {
  const row = await within(document.body).findByRole('radio', { name });
  row.scrollIntoView({ block: 'end' });
  await waitFor(() => expectRowInsideWindow(row));

  return row;
}

async function expectRowInsideWindow(row: HTMLElement): Promise<void> {
  const box = row.getBoundingClientRect();
  await expect(box.top).toBeGreaterThanOrEqual(0);
  await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
}

// A virtualized list grows as it measures the rows it renders, so it scrolls to the end again until the last row appears.
async function scrollToLastRow(
  scroll: HTMLElement,
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  return waitFor(
    () => {
      scroll.scrollTop = scroll.scrollHeight;

      return resolveLastRow(last);
    },
    { timeout: lastRowTimeout },
  );
}

// Long enough for a few rounds of finding the row after each scroll.
const lastRowTimeout = 5000;

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
