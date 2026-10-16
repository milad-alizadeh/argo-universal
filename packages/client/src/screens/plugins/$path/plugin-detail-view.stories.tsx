import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PluginDetailView } from './plugin-detail-view';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  args: { name: 'Issue tracker' },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

export const Page: StoryObj<typeof meta> = { name: 'PluginDetailView' };
