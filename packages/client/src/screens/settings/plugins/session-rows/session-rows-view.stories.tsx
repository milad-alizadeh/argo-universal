import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  deploysOff,
  issueTracker,
  sessionRowsPlugins,
} from './session-rows-fixtures';
import { SessionRowsView } from './session-rows-view';

const meta = {
  title: 'Screens/Settings/Plugins/Session rows',
  component: SessionRowsView,
  argTypes: {
    caption: { control: 'text' },
    plugins: { control: false },
    activityOwner: { control: 'text' },
  },
  parameters: { screenPreview: true },
  args: {
    plugins: { status: 'loaded', plugins: sessionRowsPlugins },
    activityOwner: null,
    onShownChange: action('show on Session rows'),
    onActivityOwnerChange: action('activity line owner'),
  },
} satisfies Meta<typeof SessionRowsView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllOn: Story = {};

export const IssueTrackerWritesTheLine: Story = {
  args: { activityOwner: issueTracker.pluginId },
};

export const DeploysOff: Story = {
  args: {
    plugins: { status: 'loaded', plugins: deploysOff },
    activityOwner: issueTracker.pluginId,
  },
};

export const Loading: Story = { args: { plugins: { status: 'loading' } } };

export const LoadError: Story = { args: { plugins: { status: 'error' } } };
