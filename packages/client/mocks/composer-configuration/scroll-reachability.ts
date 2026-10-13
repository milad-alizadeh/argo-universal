import { expect, waitFor, within } from 'storybook/test';
// The fades belong to the list they sit beside.
function fades(scroll: HTMLElement): {
  top: HTMLElement | null;
  bottom: HTMLElement | null;
} {
  const list = within(scroll.parentElement ?? scroll);
  return {
    top: list.queryByTestId('scroll-fade-top'),
    bottom: list.queryByTestId('scroll-fade-bottom'),
  };
}

export async function expectScrollsUnderFades(
  scroll: HTMLElement,
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  await waitFor(() =>
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
  );
  await expectInitialFades(scroll);
  scroll.scrollTop = scroll.scrollHeight;
  const item = await resolveLastRow(last);
  await waitFor(() => expectRowInsideScroll(scroll, item));
  await waitFor(() => expect(fades(scroll).bottom).toBeNull());
  // The top fade mounts on its own scroll event, which can land after the bottom one goes.
  await waitFor(() => expect(fades(scroll).top).toBeVisible());
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

async function expectInitialFades(scroll: HTMLElement): Promise<void> {
  await waitFor(() => expect(fades(scroll).bottom).toBeVisible());
  await expect(fades(scroll).top).toBeNull();
}
