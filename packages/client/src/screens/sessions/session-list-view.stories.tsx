import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { action } from 'storybook/actions';
import { SessionsPreviewMock } from '../../../mocks/sessions-preview-mock';
import { SessionListView } from './session-list-view';
import {
  loadedSessionListView,
  loadingSessionListView,
} from './session-list-view.mocks';

const meta = {
  title: 'Screens/Sessions/Sessions',
  component: SessionListView,
  argTypes: {
    loadState: { control: 'select', options: ['loading', 'error', 'ready'] },
  },
  parameters: { screenPreview: true },
  args: {
    ...loadedSessionListView,
    onSelect: action('select Session'),
    onRename: action('rename Session'),
    onArchive: action('archive Session'),
    onArchiveMany: action('archive selected Sessions'),
    onNewSession: action('new Session'),
    onNewSessionInProject: action('new Session in Project'),
    onProjectSettings: action('Project settings'),
    onLoadMore: action('load next page'),
    onQueryChange: action('search Sessions'),
  },
  // The list under a plain header row, as a Frame draws it.
  render: (args): ReactElement => <SessionsPreviewMock {...args} />,
} satisfies Meta<typeof SessionListView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Sessions of every Project, newest first, under the list's own search field.
export const Sessions: Story = {};

export const Loading: Story = {
  args: { ...loadingSessionListView, loadState: 'loading' },
};

export const Empty: Story = { args: { sessions: [] } };

export const LoadError: Story = {
  args: { ...loadingSessionListView, loadState: 'error' },
};

export const LiveUpdatesStopped: Story = {
  args: { liveUpdatesStopped: true },
};

export const SearchMatches: Story = {
  args: { query: 'settings' },
};

export const NextPageFailure: Story = {
  args: { loadMoreFailed: true },
};
