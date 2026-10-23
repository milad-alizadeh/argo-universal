import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import { activeSessions } from '@repo/mocks/app';
import { expect, fn, screen, within } from 'storybook/test';
import { navigationCallbacks } from '../../../mocks/sessions-view/sessions-view-navigation.test.mocks';
import {
  closingSearch,
  matchingSearch,
  noMatchingSearch,
} from '../../../mocks/sessions-view/sessions-view-search.test.mocks';
import {
  exampleProjectName,
  meta as sessionListViewMeta,
  type Story,
} from '../../../mocks/sessions-view/sessions-view-story-context.test.mocks';

const retry = { name: 'Retry' };

const loadFailure = "Couldn't load Sessions";

const loadMoreFailure = "Couldn't load more Sessions";

const meta = { ...sessionListViewMeta, title: 'Tests/Screens/Sessions' };

export default meta;

export const LoadingKeepsNewSession: Story = {
  args: { loadState: 'loading' },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('status', { name: 'Loading Sessions' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'New Session' }),
      ).toBeEnabled();
    }),
};

// The toast says why; the list keeps its loading rows and offers no inline retry.
export const LoadErrorShowsAToastOnce: Story = {
  args: { loadState: 'error' },
  play: async ({ canvas }) => {
    await expect(await findToast(loadFailure)).toBeVisible();
    await expect(await allToasts(loadFailure)).toHaveLength(1);
    // A phone's list sits in its Sessions Screen, so a width change mounts it again, as the App's root and sidebar lists are separate.
    await eachLayout(async () => {
      await expect(
        canvas.getByRole('status', { name: 'Loading Sessions' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('button', retry)).toBeNull();
      await expect(canvas.queryByRole('alert')).toBeNull();
    });
  },
};

export const LiveUpdatesStoppedShowsAToast: Story = {
  args: { liveUpdatesStopped: true },
  play: async ({ canvas }) => {
    const first = activeSessions.sessions[0];

    if (!first) throw new Error('Missing Session mock');
    await expect(await findToast('Live updates stopped')).toBeVisible();
    await expect((await canvas.findAllByText(first.title))[0]).toBeVisible();
    await expect(canvas.queryByRole('button', retry)).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const EmptyListKeepsProjects: Story = {
  args: { sessions: [] },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText(/yet/)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: exampleProjectName }),
      ).toBeVisible();
    }),
};

export const SearchWithoutMatches: Story = {
  args: { query: 'xyz', sessions: [] },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText(/matching/)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: exampleProjectName }),
      ).toBeNull();
    }),
};

export const NextPageFailureKeepsRows: Story = {
  args: { loadMoreFailed: true },
  play: async ({ canvas }) => {
    const first = activeSessions.sessions[0];

    if (!first) throw new Error('Missing Session mock');
    await expect(await findToast(loadMoreFailure)).toBeVisible();
    await expect((await canvas.findAllByText(first.title))[0]).toBeVisible();
    await expect(canvas.queryByText(loadFailure)).toBeNull();
    await expect(canvas.queryByRole('button', retry)).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const NavigationCallbacks = navigationCallbacks;

export const MatchingSearchPhone = matchingSearch(390);

export const MatchingSearchWide = matchingSearch(1440);

export const NoMatchingSearchPhone = noMatchingSearch(390);

export const NoMatchingSearchWide = noMatchingSearch(1440);

export const ClosingSearchPhone = closingSearch(390);

export const ClosingSearchWide = closingSearch(1440);

const onArchive = fn();

const foundIdleRow = activeSessions.sessions.find(
  (session) => session.status === 'idle',
);

if (!foundIdleRow) throw new Error('Recorded catalog needs an idle Session');

const idleRow = foundIdleRow;

// A row's right-click menu archives its Session through the list.
function archiveFromARowAt(layout: keyof typeof layoutWidths): Story {
  return {
    args: { onArchive },
    beforeEach: async () => {
      onArchive.mockClear();
      await settleViewport(layoutWidths[layout]);
    },
    play: async ({ canvas, userEvent }) => {
      const [title] = await canvas.findAllByText(idleRow.title);

      if (!title) throw new Error('Missing idle row');
      await userEvent.pointer({ keys: '[MouseRight]', target: title });
      const menu = within(await screen.findByRole('menu'));
      await userEvent.click(menu.getByRole('menuitem', { name: 'Archive' }));
      await expect(onArchive).toHaveBeenCalledWith(idleRow.sessionId);
    },
  };
}

export const ArchiveFromARowOnPhone: Story = archiveFromARowAt('phone');

export const ArchiveFromARowWide: Story = archiveFromARowAt('wide');

// A phone's Sessions Screen: New Session is its primary Action, and the filter its one header Action, which marks a changed view.
export const PhonePageFiltersTheView: Story = {
  beforeEach: () => settleViewport(layoutWidths.phone),
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'New Session' }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Filter Sessions' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Compact' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Filter Sessions, Changed' }),
    ).toBeVisible();
  },
};
