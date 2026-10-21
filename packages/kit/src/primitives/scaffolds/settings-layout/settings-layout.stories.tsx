import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { SettingsLayout, type SettingsLayoutProps } from './index';
import {
  ExampleSettingsLayout,
  exampleSections,
} from './settings-layout.mocks';

// Each variation holds its own page; the story's args only satisfy the component's type.
const args: SettingsLayoutProps = { sections: exampleSections };

const meta = {
  title: 'Design System/Primitives/Scaffolds/SettingsLayout',
  component: SettingsLayout,
  argTypes: kitArgTypes('SettingsLayout'),
  args,
} satisfies Meta<typeof SettingsLayout>;

export default meta;

// Below the wide breakpoint the list is the screen and a row pushes its page.
export const Overview: StoryObj<typeof meta> = {
  name: 'SettingsLayout',
  render: () => (
    <Variations>
      <Variation label="A page shown">
        <View className="h-120">
          <ExampleSettingsLayout initial="projects" />
        </View>
      </Variation>
      <Variation label="The list alone">
        <View className="h-120">
          <ExampleSettingsLayout />
        </View>
      </Variation>
    </Variations>
  ),
};
