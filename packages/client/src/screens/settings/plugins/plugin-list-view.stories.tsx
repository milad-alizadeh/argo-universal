import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginListView } from './plugin-list-view';
import { pluginRows } from './plugin-settings.fixtures';

const meta = {
  title: 'Screens/Settings/Plugins',
  component: PluginListView,
  argTypes: {
    caption: { control: 'text' },
    plugins: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    plugins: { status: 'loaded', plugins: pluginRows },
    onOpenPlugin: action('open Plugin'),
  },
} satisfies Meta<typeof PluginListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPlugins: Story = {
  args: { plugins: { status: 'loaded', plugins: [] } },
};

export const Loading: Story = { args: { plugins: { status: 'loading' } } };

export const LoadError: Story = { args: { plugins: { status: 'error' } } };
