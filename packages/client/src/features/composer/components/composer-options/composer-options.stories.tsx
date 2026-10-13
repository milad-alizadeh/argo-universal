import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { composerProps } from '../../../../../mocks/composer-mock';
import {
  composerSettingsOptions,
  updateComposerSettings,
} from '../../../../../mocks/composer-mock';
import { ComposerOptions } from './composer-options';

const configuration = composerProps({
  draft: { text: '', attachments: [] },
  onDraftChange: () => {},
  onSend: () => {},
  onAttachImages: () => {},
}).configuration;

if (!configuration) throw new Error('Composer settings need configuration.');

function SettingsPreview({
  configuration,
  disabled,
}: React.ComponentProps<typeof ComposerOptions>): React.JSX.Element {
  const [configOptions, setConfigOptions] = useState(
    configuration.configOptions,
  );

  const shown = previewConfiguration(
    configuration,
    configOptions,
    setConfigOptions,
  );

  return <SettingsLayout configuration={shown} disabled={disabled} />;
}

function SettingsLayout(
  props: React.ComponentProps<typeof ComposerOptions>,
): React.JSX.Element {
  return (
    <View className="flex-1 justify-end items-start p-4">
      <ComposerOptions {...props} />
    </View>
  );
}

const meta = {
  title: 'Composer/ComposerOptions',
  component: ComposerOptions,
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => <SettingsPreview {...args} />,
  args: {
    disabled: false,
    configuration: { ...configuration, configOptions: composerSettingsOptions },
  },
} satisfies Meta<typeof ComposerOptions>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'ComposerOptions' };

function previewConfiguration(
  configuration: React.ComponentProps<typeof ComposerOptions>['configuration'],
  configOptions: typeof configuration.configOptions,
  setConfigOptions: React.Dispatch<React.SetStateAction<typeof configOptions>>,
): typeof configuration {
  return {
    ...configuration,
    configOptions,
    onConfigChange: (configId, value) =>
      setConfigOptions((options) =>
        updateComposerSettings(options, configId, value),
      ),
  };
}
