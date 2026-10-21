import {
  counterRoot,
  runListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginDetailView } from './plugin-detail-view';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  args: {
    root: counterRoot,
    onEvent: action('Plugin event'),
  },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

export const Page: StoryObj<typeof meta> = {};

export const ListPage: StoryObj<typeof meta> = {
  name: 'List page',
  args: { root: runListRoot },
};
