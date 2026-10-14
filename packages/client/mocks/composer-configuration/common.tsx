import type { StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { within } from 'storybook/test';
import { ComposerAgentModelControl } from '../../src/features/composer/components/composer-configuration/composer-configuration';
export type Story = StoryObj<typeof ComposerAgentModelControl>;
export type Configuration = React.ComponentProps<
  typeof ComposerAgentModelControl
>['configuration'];
export const agentModelLabel = 'Agent and model';
export const modelsScrollId = 'composer-models-scroll';
export const agentsScrollId = 'composer-agents-scroll';
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

// Opens the Agent and model menu, then its Agent choices.
export async function openAgentChoices(context: PlayContext): Promise<void> {
  await context.userEvent.click(
    context.canvas.getByRole('button', { name: agentModelLabel }),
  );
  await context.userEvent.click(
    await within(document.body).findByRole('button', {
      name: chooseAgentLabel,
    }),
  );
}
