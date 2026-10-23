import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SettingsLayout, type SettingsLayoutProps } from './index';
import {
  ExampleSettingsLayout,
  exampleSections,
} from './settings-layout.mocks';

// Each story holds its own page; the meta args only satisfy the component's type.
const args: SettingsLayoutProps = { sections: exampleSections };

const meta = {
  title: 'Design System/Primitives/Scaffolds/SettingsLayout',
  component: SettingsLayout,
  argTypes: kitArgTypes('SettingsLayout'),
  args,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-120">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof SettingsLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Each story keeps its own render: the page shown is state the example holds, standing in for the
 * App's router. Below the wide breakpoint the list is the screen and a row pushes its page.
 */
export const ScreenShown: Story = {
  render: () => <ExampleSettingsLayout initial="projects" />,
};

export const ListAlone: Story = { render: () => <ExampleSettingsLayout /> };
