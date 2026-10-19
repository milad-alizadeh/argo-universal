import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import type { PlayContext, Story } from './settings-pages-story.test.mocks';

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
const phonePages = [
  'Projects',
  'Agents',
  'Plugins',
  'Accounts',
  'Connection',
  'Appearance',
];

const widePages = [
  'Projects',
  'Agents',
  'Plugins',
  'Accounts',
  'Connection',
  'Devices',
  'Appearance',
  'Notifications',
];

// Every width lists its pages in one list, without group headings.
async function expectOneFlatList(
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
  await expect(canvas.queryByRole('heading')).toBeNull();
}

async function clickEveryWidthsPages({
  canvas,
  userEvent,
}: Pointer): Promise<void> {
  for (const name of phonePages) {
    const row = canvas.getByRole('link', {
      name: new RegExp(`^${name}(?:,|$)`),
    });

    await (name === 'Connection'
      ? expect(row).toHaveAccessibleName(/, available$/)
      : expect(row).not.toHaveAccessibleName(/, available$/));
    await expect(row).toHaveAttribute(
      'href',
      `/settings/${name.toLowerCase()}`,
    );
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
      await expectOneFlatList(canvas, width);
      await clickEveryWidthsPages({ canvas, userEvent });
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
    },
  };
}
