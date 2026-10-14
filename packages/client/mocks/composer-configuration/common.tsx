import type { StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { ComposerAgentModelControl } from '../../src/features/composer/components/composer-configuration/composer-configuration';

export type Story = StoryObj<typeof ComposerAgentModelControl>;

export type Configuration = React.ComponentProps<
  typeof ComposerAgentModelControl
>['configuration'];

export const agentModelLabel = 'Agent and model';

// The option lists, by the name their list role carries.
export const modelsList = 'Model';

export const agentsList = 'Agent';

export const effortValue = 'aria-valuetext';

export const chooseAgentLabel = /^Agent,/;

export const heldNotice =
  'A Turn is running. Changes apply from the next Turn.';

// Keeps the test's own callbacks, which the presentation render replaces with actions.
export function renderArgs(
  args: React.ComponentProps<typeof ComposerAgentModelControl>,
): React.JSX.Element {
  return (
    <View className="p-4">
      <ComposerAgentModelControl {...args} />
    </View>
  );
}

export type PlayContext = Parameters<NonNullable<Story['play']>>[0];
