import { activeSessions, projectsList } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { eachLayout } from '../../../lib/generic/each-layout';
import { SessionsView } from './sessions-view';
import { loadedSessionsView } from './sessions-view.fixtures';

const exampleProjectName = 'Example Project';
const retry = { name: 'Retry' };

const spies = {
  onSelect: fn(),
  onNewSession: fn(),
  onNewSessionInProject: fn(),
  onProjectSettings: fn(),
  onLoadMore: fn(),
  onRetry: fn(),
  onRetryLiveUpdates: fn(),
  onRetryLoadMore: fn(),
};

const meta = {
  title: 'Tests/SessionsView',
  component: SessionsView,
  parameters: { screenPreview: true },
  args: { ...loadedSessionsView, ...spies },
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

export const RetryAfterLoadError: Story = {
  args: { loadState: 'error' },
  play: async ({ canvas, userEvent, args }) =>
    eachLayout(async () => {
      args.onRetry.mockClear();
      await expect(
        await canvas.findByText("Couldn't load Sessions"),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', retry));
      await expect(args.onRetry).toHaveBeenCalledTimes(1);
    }),
};

export const RetryLiveUpdates: Story = {
  args: { liveUpdatesStopped: true },
  play: async ({ canvas, userEvent, args }) =>
    eachLayout(async () => {
      args.onRetryLiveUpdates.mockClear();
      const alert = await canvas.findByRole('alert');
      await expect(alert).toHaveTextContent('Live updates stopped');
      await expect(canvas.queryByText("Couldn't load Sessions")).toBeNull();
      await userEvent.click(canvas.getByRole('button', retry));
      await expect(args.onRetryLiveUpdates).toHaveBeenCalledTimes(1);
    }),
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
      await expect(
        await canvas.findByText('No matching Sessions'),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: exampleProjectName }),
      ).toBeNull();
    }),
};

export const NextPageFailureKeepsRows: Story = {
  args: { loadMoreFailed: true },
  play: async ({ canvas, userEvent, args }) => {
    const first = activeSessions.sessions[0];
    if (!first) throw new Error('Missing Session mock');
    await expect(
      await canvas.findByText("Couldn't load more Sessions"),
    ).toBeVisible();
    await expect((await canvas.findAllByText(first.title))[0]).toBeVisible();
    await expect(canvas.queryByText("Couldn't load Sessions")).toBeNull();
    await userEvent.click(canvas.getByRole('button', retry));
    await expect(args.onRetryLoadMore).toHaveBeenCalledTimes(1);
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
