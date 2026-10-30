import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginSettingsDetailView } from './plugin-settings-detail-view';
import {
  loadedPlugin,
  pluginWithoutSettings,
  pluginWithSecret,
  turnedOffPlugin,
} from './plugin-settings-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Plugin',
  component: PluginSettingsDetailView,
  argTypes: {
    title: { control: 'text' },
    caption: { control: 'text' },
    plugin: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    title: 'GitHub',
    plugin: loadedPlugin,
    onEnabledChange: action('turn Plugin on or off'),
    onSettingChange: action('change setting'),
    onBack: action('back'),
  },
} satisfies Meta<typeof PluginSettingsDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecretSaved: Story = { args: { plugin: pluginWithSecret } };

export const TurnedOff: Story = { args: { plugin: turnedOffPlugin } };

export const NoSettings: Story = {
  args: { title: 'Example', plugin: pluginWithoutSettings },
};

export const Loading: Story = { args: { plugin: { status: 'loading' } } };

export const Missing: Story = {
  args: { title: 'old-plugin', plugin: { status: 'missing' } },
};
