import { expect, waitFor, within } from 'storybook/test';
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
  return item;
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
export async function lastVisible(name: string): Promise<HTMLElement> {
  const row = await within(document.body).findByRole('button', { name });
  row.scrollIntoView({ block: 'end' });
  await waitFor(() => expectRowInsideWindow(row));
  return row;
}
async function expectRowInsideWindow(row: HTMLElement): Promise<void> {
  const box = row.getBoundingClientRect();
  await expect(box.top).toBeGreaterThanOrEqual(0);
  await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
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
