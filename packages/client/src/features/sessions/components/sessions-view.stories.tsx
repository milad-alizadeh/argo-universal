import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { useSessionsFilter } from '../state/sessions-filter';
import { SessionsHeader } from './sessions-header';
import { SessionsView } from './sessions-view';
import { loadedSessionsView } from './sessions-view.fixtures';

const meta = {
  title: 'Screens/SessionsScreen',
  component: SessionsView,
  parameters: { screenPreview: true },
  args: {
    ...loadedSessionsView,
    onSelect: action('select Session'),
    onNewSession: action('new Session'),
    onNewSessionInProject: action('new Session in Project'),
    onProjectSettings: action('Project settings'),
    onLoadMore: action('load next page'),
    onRetry: action('retry'),
    onRetryLiveUpdates: action('retry live updates'),
    onRetryLoadMore: action('retry next page'),
  },
  // The list under a plain header row, as a shell draws it.
  render: function Preview(args): React.JSX.Element {
    const filter = useSessionsFilter();
    return (
      <View className="flex-1 w-full" style={{ minHeight: 0 }}>
        <View className="h-11 wide:h-14 flex-row items-center gap-0.5 px-2">
          <SessionsHeader {...filter} />
        </View>
        <SessionsView {...args} />
      </View>
    );
  },
} satisfies Meta<typeof SessionsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionsScreen' };

export const Loading: Story = { args: { loadState: 'loading' } };

export const Empty: Story = { args: { sessions: [] } };

export const LoadError: Story = { args: { loadState: 'error' } };

export const LiveUpdatesStopped: Story = {
  args: { liveUpdatesStopped: true },
};

export const Offline: Story = { args: { connection: 'offline' } };

export const NoMatchingSessions: Story = {
  args: { query: 'xyz', sessions: [] },
};

export const NextPageLoading: Story = {
  args: { isFetchingNextPage: true },
};

export const NextPageFailure: Story = {
  args: { loadMoreFailed: true },
};
