import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { action } from 'storybook/actions';
import { SessionsPreviewMock } from '../../../../../mocks/sessions-preview-mock';
import { SessionsView } from './sessions-view';
import { loadedSessionsView } from './sessions-view.mocks';

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
    onQueryChange: action('search Sessions'),
  },
  // The list under a plain header row, as a shell draws it.
  render: (args): ReactElement => <SessionsPreviewMock {...args} />,
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

export const NoMatchingSessions: Story = {
  args: { query: 'xyz', sessions: [] },
};

export const SearchMatches: Story = {
  args: { query: 'settings' },
};

export const NextPageLoading: Story = {
  args: { isFetchingNextPage: true },
};

export const NextPageFailure: Story = {
  args: { loadMoreFailed: true },
};
