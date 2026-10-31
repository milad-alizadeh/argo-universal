import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginListView } from './plugin-list-view';
import { pluginRows } from './plugin-settings.fixtures';

const meta = {
  title: 'Screens/Settings/Plugins',
  component: PluginListView,
  argTypes: {
    plugins: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    plugins: { status: 'loaded', plugins: pluginRows },
    slots: [],
    onOpenPlugin: action('open Plugin'),
    onOpenSlot: action('open Slot page'),
  },
} satisfies Meta<typeof PluginListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SlotRows: Story = {
  args: {
    slots: [{ slotId: 'argo/session/row/v1', title: 'Session rows', count: 3 }],
  },
};

export const NoPlugins: Story = {
  args: { plugins: { status: 'loaded', plugins: [] } },
};

export const Loading: Story = { args: { plugins: { status: 'loading' } } };

export const LoadError: Story = { args: { plugins: { status: 'error' } } };
