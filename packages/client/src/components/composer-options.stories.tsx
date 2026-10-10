import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { composerProps } from '../../mocks/composer-mock';
import {
  composerSettingsOptions,
  updateComposerSettings,
} from '../../mocks/composer-settings-mock';
import { ComposerOptions } from './composer-options';

const configuration = composerProps({
  draft: { text: '', images: [] },
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
  return (
    <View className="flex-1 justify-end items-start p-4">
      <ComposerOptions
        disabled={disabled}
        configuration={{
          ...configuration,
          configOptions,
          onConfigChange: (configId, value) =>
            setConfigOptions((options) =>
              updateComposerSettings(options, configId, value),
            ),
        }}
      />
    </View>
  );
}
const meta = {
  title: 'Sessions/ComposerOptions',
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
