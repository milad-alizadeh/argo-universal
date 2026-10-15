import { activeSessions } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import { eachLayout } from '#lib/generic/each-layout';
import { allToasts, findToast } from '../../../mocks/find-toast';
import { navigationCallbacks } from '../../../mocks/sessions-view/sessions-view-navigation.test.mocks';
import {
  closingSearch,
  matchingSearch,
  noMatchingSearch,
} from '../../../mocks/sessions-view/sessions-view-search.test.mocks';
import {
  exampleProjectName,
  meta as sessionListViewMeta,
  noMatches,
  type Story,
} from '../../../mocks/sessions-view/sessions-view-story-context.test.mocks';

const retry = { name: 'Retry' };

const loadFailure = "Couldn't load Sessions";

const loadMoreFailure = "Couldn't load more Sessions";

const meta = { ...sessionListViewMeta, title: 'Tests/SessionListView' };

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
    await eachLayout(async () => {
      await expect(
        canvas.getByRole('status', { name: 'Loading Sessions' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('button', retry)).toBeNull();
      await expect(canvas.queryByRole('alert')).toBeNull();
    });
    await expect(await allToasts(loadFailure)).toHaveLength(1);
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
      await expect(await canvas.findByText('No Sessions yet.')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: exampleProjectName }),
      ).toBeVisible();
    }),
};

export const SearchWithoutMatches: Story = {
  args: { query: 'xyz', sessions: [] },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByText(noMatches)).toBeVisible();
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
