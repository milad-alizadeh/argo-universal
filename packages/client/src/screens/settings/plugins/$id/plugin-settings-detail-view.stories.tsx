import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  savedSettings,
  savedSettingsWithToken,
  settingsSchema,
} from '../plugin-settings.fixtures';
import { PluginSettingsDetailView } from './plugin-settings-detail-view';

const meta = {
  title: 'Screens/Settings/Plugin',
  component: PluginSettingsDetailView,
  parameters: { screenPreview: true },
  args: {
    title: 'GitHub',
    plugin: {
      status: 'loaded',
      enabled: true,
      fields: settingsSchema,
      settings: savedSettings,
    },
    onEnabledChange: action('turn Plugin on or off'),
    onSettingChange: action('change setting'),
    onBack: action('back'),
  },
} satisfies Meta<typeof PluginSettingsDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecretSaved: Story = {
  args: {
    plugin: {
      status: 'loaded',
      enabled: true,
      fields: settingsSchema,
      settings: savedSettingsWithToken,
    },
  },
};

export const TurnedOff: Story = {
  args: {
    plugin: {
      status: 'loaded',
      enabled: false,
      fields: settingsSchema,
      settings: savedSettings,
    },
  },
};

export const NoSettings: Story = {
  args: {
    title: 'Hello',
    plugin: {
      status: 'loaded',
      enabled: true,
      fields: [],
      settings: { values: {}, secretsSet: [] },
    },
  },
};

export const Loading: Story = { args: { plugin: { status: 'loading' } } };

export const Missing: Story = {
  args: { title: 'old-plugin', plugin: { status: 'missing' } },
};
