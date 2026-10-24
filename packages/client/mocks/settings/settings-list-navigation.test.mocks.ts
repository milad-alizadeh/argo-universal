import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { expect, waitFor } from 'storybook/test';
import type { PlayContext, Story } from './settings-list-story.test.mocks';
import { appearanceRow } from './settings-list-theme.test.mocks';

type Pointer = Pick<PlayContext, 'canvas' | 'userEvent'>;

type OnSelect = PlayContext['args']['onSelect'];

// The list opened exactly these paths, in order, after the first `from` it opened.
async function expectOpened(
  onSelect: OnSelect,
  hrefs: readonly string[],
  from = 0,
): Promise<void> {
  await expect(onSelect).toHaveBeenCalledTimes(from + hrefs.length);

  for (const [index, href] of hrefs.entries())
    await expect(onSelect).toHaveBeenNthCalledWith(from + index + 1, href);
}

// A phone leaves out Devices and Notifications.
const phonePages = ['Projects', 'Agents', 'Plugins', 'Accounts', 'Connection'];

const widePages = [
  'Projects',
  'Agents',
  'Plugins',
  'Accounts',
  'Connection',
  'Devices',
  'Notifications',
];

const groups = ['Workspace', 'Account', 'Connection'];

/*
 * Every width lists its pages under the groups' titles, Theme last; Appearance chooses in place, so it is no link. A
 * wide sidebar's titles are headings; a phone's FieldGroup draws them as its sections' captions, as Theme's always is.
 */
async function expectGroupedPages(
  canvas: PlayContext['canvas'],
  width: number,
): Promise<void> {
  await waitFor(() =>
    expect(
      canvas
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')?.split(',')[0]),
    ).toEqual(width === layoutWidths.phone ? phonePages : widePages),
  );
  await (width === layoutWidths.phone
    ? expect(
        groups.every((group) => canvas.queryAllByText(group).length > 0),
      ).toBe(true)
    : expect(
        canvas.getAllByRole('heading').map((heading) => heading.textContent),
      ).toEqual(groups));
  await expect(canvas.getByText('Theme')).toBeVisible();
  await expect(appearanceRow(canvas)).toBeVisible();
}

// A wide sidebar's rows are anchors to their pages; a phone's FieldGroup rows open theirs when pressed.
async function expectAnchor(
  row: HTMLElement,
  name: string,
  width: number,
): Promise<void> {
  if (width === layoutWidths.phone) return;

  await expect(row).toHaveAttribute('href', `/settings/${name.toLowerCase()}`);
}

async function clickEveryWidthsPages(
  { canvas, userEvent }: Pointer,
  width: number,
): Promise<void> {
  for (const name of phonePages) {
    const row = canvas.getByRole('link', {
      name: new RegExp(`^${name}(?:,|$)`),
    });

    await (name === 'Connection'
      ? expect(row).toHaveAccessibleName(/, available$/)
      : expect(row).not.toHaveAccessibleName(/, available$/));
    await expectAnchor(row, name, width);
    await userEvent.click(row);
  }
}

async function clickWidePages({
  canvas,
  userEvent,
  args,
}: Pointer & Pick<PlayContext, 'args'>): Promise<void> {
  await userEvent.click(canvas.getByRole('link', { name: /^Devices(?:,|$)/ }));
  await userEvent.click(
    canvas.getByRole('link', { name: /^Notifications(?:,|$)/ }),
  );
  await expectOpened(
    args.onSelect,
    ['/settings/devices', '/settings/notifications'],
    phonePages.length,
  );
}

export function allPagesNavigate(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expectOpened(args.onSelect, []);
      await expectGroupedPages(canvas, width);
      await clickEveryWidthsPages({ canvas, userEvent }, width);
      await expectOpened(
        args.onSelect,
        phonePages.map((name) => `/settings/${name.toLowerCase()}`),
      );

      if (width === layoutWidths.phone) return;
      await clickWidePages({ canvas, userEvent, args });
    },
  };
}

export function searchNarrowsThePages(width: number): Story {
  return {
    args: { query: ' agen' },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('link', { name: /^Agents, 1/ }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('link', { name: /^Projects/ }),
      ).not.toBeInTheDocument();
    },
  };
}

export function searchSaysWhenNothingMatches(width: number): Story {
  return {
    args: { query: 'mistral' },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByText('No matching settings')).toBeVisible();
      await expect(
        canvas.getByText('No Settings page has "mistral" in its name.'),
      ).toBeVisible();
      await expect(canvas.queryByRole('link')).toBeNull();
      await expect(canvas.queryByRole('button')).toBeNull();
    },
  };
}
