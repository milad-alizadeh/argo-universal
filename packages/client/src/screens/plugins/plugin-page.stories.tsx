import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PluginPage } from './plugin-page';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginPage,
  parameters: { screenPreview: true },
  args: { name: 'Issue tracker' },
} satisfies Meta<typeof PluginPage>;

export default meta;

export const Page: StoryObj<typeof meta> = { name: 'Plugin page' };
