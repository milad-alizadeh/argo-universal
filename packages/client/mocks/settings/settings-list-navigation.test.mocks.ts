import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  type PlayContext,
  recorder,
  type Story,
} from './settings-list-story.test.mocks';

type Pointer = Pick<PlayContext, 'canvas' | 'userEvent'>;

// A phone leaves out Devices and Notifications.
const phonePages = [
  'Projects',
  'Agents',
  'Accounts',
  'Connection',
  'Appearance',
];

const widePages = [
  'Projects',
  'Agents',
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

async function clickWidePages({ canvas, userEvent }: Pointer): Promise<void> {
  await userEvent.click(canvas.getByRole('link', { name: /^Devices(?:,|$)/ }));
  await userEvent.click(
    canvas.getByRole('link', { name: /^Notifications(?:,|$)/ }),
  );
  await expect(recorder.destinations.slice(-2)).toEqual([
    { to: 'settings-devices' },
    { to: 'settings-notifications' },
  ]);
}

export function allPagesNavigate(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(recorder.destinations).toEqual([]);
      await expectOneFlatList(canvas, width);
      await clickEveryWidthsPages({ canvas, userEvent });
      await expect(recorder.destinations).toEqual([
        { to: 'settings-projects' },
        { to: 'settings-agents' },
        { to: 'settings-accounts' },
        { to: 'settings-connection' },
        { to: 'settings-appearance' },
      ]);

      if (width === layoutWidths.phone) return;
      await clickWidePages({ canvas, userEvent });
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
      await expect(
        canvas.getByRole('group', { name: 'No settings match.' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('link')).toBeNull();
    },
  };
}
