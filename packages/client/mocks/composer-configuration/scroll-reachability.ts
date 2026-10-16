import { expect, waitFor, within } from 'storybook/test';

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
