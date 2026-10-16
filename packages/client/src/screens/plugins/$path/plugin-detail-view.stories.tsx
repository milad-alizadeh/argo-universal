import { helloRoot } from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PluginDetailView } from './plugin-detail-view';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  args: {
    root: helloRoot,
    onEvent: fn(),
  },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

export const Page: StoryObj<typeof meta> = { name: 'PluginDetailView' };
