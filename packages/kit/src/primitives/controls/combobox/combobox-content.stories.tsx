import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Combobox } from './combobox';
import {
  couldNotLoadComboboxContent,
  emptyComboboxContent,
  loadingComboboxContent,
} from './combobox-content-fixtures';

/*
 * The choices themselves, drawn without their overlay, so a load state reads on the page. The field
 * keeps the same trigger behind every one of them, so these are the choices' states and not its own
 * (ADR-0040 decision 5).
 */
const meta = {
  title: 'Design System/Primitives/Controls/Combobox/Content',
  component: Combobox,
  args: { ...emptyComboboxContent, onValueChange: (): void => {} },
  argTypes: kitArgTypes('Combobox'),
  render: (args): ReactElement => (
    <View className="native:h-64">
      <Combobox.Content {...args} />
    </View>
  ),
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: loadingComboboxContent };

export const Empty: Story = { args: emptyComboboxContent };

export const CouldNotLoad: Story = { args: couldNotLoadComboboxContent };
