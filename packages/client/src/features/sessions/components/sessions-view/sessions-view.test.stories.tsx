import { activeSessions, projectsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { allToasts, findToast } from '../../../../../mocks/find-toast';
import { SessionsPreviewMock } from '../../../../../mocks/sessions-preview-mock';
import { eachLayout } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { useSessionsFilter } from '../../state/sessions-filter';
import { SessionsHeader } from '../sessions-header';
import { SessionsView } from './sessions-view';
import { loadedSessionsView } from './sessions-view.mocks';

const exampleProjectName = 'Example Project';
const retry = { name: 'Retry' };
const loadFailure = "Couldn't load Sessions";
const loadMoreFailure = "Couldn't load more Sessions";
const noMatches = 'No matching Sessions';

const spies = {
  onSelect: fn(),
  onNewSession: fn(),
  onNewSessionInProject: fn(),
  onProjectSettings: fn(),
  onLoadMore: fn(),
  onQueryChange: fn(),
};

const meta = {
  title: 'Tests/SessionsView',
  component: SessionsView,
  parameters: { screenPreview: true },
  args: { ...loadedSessionsView, ...spies },
  // Wide, New Session sits in the sidebar's header row above the list.
  render: function WithHeader(args): React.JSX.Element {
    const wide = useWide();
    const filter = useSessionsFilter();
    return (
      <>
        {wide && (
          <SessionsHeader {...filter} onNewSession={args.onNewSession} />
        )}
        <SessionsView {...args} />
      </>
    );
  },
  beforeEach: (): void => {
    for (const spy of Object.values(spies)) spy.mockClear();
  },
} satisfies Meta<typeof SessionsView>;
export default meta;
type Story = StoryObj<typeof meta>;

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

export const OfflineShowsBannerOnly: Story = {
  args: { connection: 'offline' },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('status')).toHaveTextContent(
        'The Server is offline.',
      );
      await expect(canvas.queryByRole('alert')).toBeNull();
    }),
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

export const NavigationCallbacks: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const running = activeSessions.sessions[0];
    const project = projectsList[0];
    if (!running || !project)
      throw new Error('Missing Session or Project mock');
    await userEvent.click(canvas.getByRole('button', { name: 'New Session' }));
    await expect(args.onNewSession).toHaveBeenCalledTimes(1);

    const [row] = await canvas.findAllByRole('button', {
      name: new RegExp(`^${running.title}, `),
    });
    if (!row) throw new Error('Missing Session row');
    await userEvent.click(row);
    await expect(args.onSelect).toHaveBeenCalledWith(running.sessionId);

    const heading = canvas.getByRole('button', { name: exampleProjectName });
    await userEvent.hover(heading);
    await userEvent.click(
      canvas.getByRole('button', {
        name: `New Session in ${exampleProjectName}`,
      }),
    );
    await expect(args.onNewSessionInProject).toHaveBeenCalledWith(project.id);
    await userEvent.hover(heading);
    await userEvent.click(
      canvas.getByRole('button', {
        name: `Project settings for ${exampleProjectName}`,
      }),
    );
    await expect(args.onProjectSettings).toHaveBeenCalledWith(project.name);
  },
};

function searchPreview(width: number, query: string): Story {
  return {
    args: { query, sessions: [sessionRows.running, sessionRows.idle] },
    render: (args) => <SessionsPreviewMock {...args} />,
    beforeEach: async () => {
      await settleViewport(width);
    },
  };
}

function matchingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'setting'),
    play: async ({ canvas, userEvent }) => {
      const input = canvas.getByRole('textbox', { name: 'Search Sessions' });
      await userEvent.type(input, 's');
      await expect(input).toHaveValue('settings');
      await expect(
        await canvas.findByRole('button', {
          name: 'Build the settings screen, Running',
        }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Finished work, Idle' }),
      ).toBeNull();
    },
  };
}

function noMatchingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'settings'),
    play: async ({ canvas, userEvent }) => {
      await userEvent.type(
        canvas.getByRole('textbox', { name: 'Search Sessions' }),
        'xyz',
      );
      await expect(await canvas.findByText(noMatches)).toBeVisible();
      await expect(
        canvas.queryByRole('button', {
          name: 'Build the settings screen, Running',
        }),
      ).toBeNull();
    },
  };
}

function closingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'xyz'),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await expect(
        await canvas.findByRole('button', { name: 'Finished work, Idle' }),
      ).toBeVisible();
      await expect(canvas.queryByText(noMatches)).toBeNull();
    },
  };
}

export const MatchingSearchPhone = matchingSearch(390);
export const MatchingSearchWide = matchingSearch(1440);
export const NoMatchingSearchPhone = noMatchingSearch(390);
export const NoMatchingSearchWide = noMatchingSearch(1440);
export const ClosingSearchPhone = closingSearch(390);
export const ClosingSearchWide = closingSearch(1440);
