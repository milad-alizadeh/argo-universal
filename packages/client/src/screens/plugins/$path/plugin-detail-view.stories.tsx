import {
  counterRoot,
  runListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginDetailView } from './plugin-detail-view';
import {
  issueFilters,
  issueFiltersUnavailable,
} from './plugin-detail-view-fixtures';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginDetailView,
  argTypes: {
    title: { control: 'text' },
    root: { control: false },
    callbacks: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    root: counterRoot,
    callbacks: { onPageCall: action('Page call') },
  },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

export const Page: StoryObj<typeof meta> = {};

export const ListPage: StoryObj<typeof meta> = {
  name: 'List page',
  args: { root: runListRoot },
};

export const IssueFilters: StoryObj<typeof meta> = {
  args: issueFilters,
};

export const IssueFiltersUnavailable: StoryObj<typeof meta> = {
  args: issueFiltersUnavailable,
};
