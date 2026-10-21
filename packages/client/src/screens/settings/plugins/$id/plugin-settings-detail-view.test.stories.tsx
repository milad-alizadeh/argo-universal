import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  savedSettings,
  savedSettingsWithToken,
  settingsSchema,
} from '../plugin-settings.fixtures';
import {
  enabledLabel,
  PluginSettingsDetailView,
} from './plugin-settings-detail-view';

const loaded = {
  status: 'loaded',
  enabled: true,
  fields: settingsSchema,
  settings: savedSettings,
} as const;

const meta = {
  title: 'Tests/Screens/Settings/Plugin',
  component: PluginSettingsDetailView,
  parameters: { screenPreview: true },
  args: {
    title: 'GitHub',
    plugin: loaded,
    onEnabledChange: fn(),
    onSettingChange: fn(),
    onBack: fn(),
  },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof PluginSettingsDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThePluginsSwitchComesFirst: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'GitHub', level: 1 }),
    ).toBeVisible();
    await expect(canvas.getAllByRole('switch')[0]).toHaveAccessibleName(
      enabledLabel,
    );
    await expect(
      canvas.getByRole('switch', { name: enabledLabel }),
    ).toBeChecked();
  },
};

export const TurningThePluginOffAsksTheServer: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', { name: enabledLabel }));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(false);
  },
};

export const BuildsARowForEachField: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Host' })).toHaveValue(
      'github.com',
    );
    await expect(canvas.getByLabelText('Token')).toHaveAttribute(
      'type',
      'password',
    );
    await expect(canvas.queryByText('Clear Token')).toBeNull();
    await expect(
      canvas.getByRole('switch', { name: 'Show closed pull requests' }),
    ).not.toBeChecked();
    await expect(canvas.getByText('Recently updated')).toBeVisible();
  },
};

export const DescriptionsAreFooters: Story = {
  play: async ({ canvas }) => {
    for (const field of settingsSchema)
      if (field.description)
        await expect(canvas.getByText(field.description)).toBeVisible();
  },
};

export const TextSavesWhenTheFieldLosesFocus: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const host = canvas.getByRole('textbox', { name: 'Host' });

    await userEvent.clear(host);
    await userEvent.type(host, 'github.example.com');
    await expect(args.onSettingChange).not.toHaveBeenCalled();
    host.blur();
    await expect(args.onSettingChange).toHaveBeenCalledWith(
      'host',
      'github.example.com',
    );
  },
};

export const AnUnchangedFieldSavesNothing: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const host = canvas.getByRole('textbox', { name: 'Host' });

    await userEvent.click(host);
    host.blur();
    await expect(args.onSettingChange).not.toHaveBeenCalled();
  },
};

export const ASecretIsNeverShown: Story = {
  args: { plugin: { ...loaded, settings: savedSettingsWithToken } },
  play: async ({ args, canvas, userEvent }) => {
    const token = canvas.getByLabelText('Token');

    await expect(token).toHaveValue('');
    await expect(token).toHaveAttribute('placeholder', 'Saved in the Keychain');
    await userEvent.type(token, 'ghp_new');
    token.blur();
    await expect(args.onSettingChange).toHaveBeenCalledWith('token', 'ghp_new');
    await expect(token).toHaveValue('');
  },
};

export const ClearingASavedSecretSendsItEmpty: Story = {
  args: { plugin: { ...loaded, settings: savedSettingsWithToken } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Clear Token'));
    await expect(args.onSettingChange).toHaveBeenCalledWith('token', '');
  },
};

export const ToggleSavesAtOnce: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Show closed pull requests' }),
    );
    await expect(args.onSettingChange).toHaveBeenCalledWith(
      'show-closed',
      true,
    );
  },
};

export const APluginWithNoSchemaHasOnlyItsSwitch: Story = {
  args: { plugin: { ...loaded, fields: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('switch')).toHaveLength(1);
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
};

export const BackLeavesThePlugin: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

export const SaysWhenThePluginIsMissing: Story = {
  args: { title: 'old-plugin', plugin: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/no Plugin named old-plugin/)).toBeVisible();
  },
};
