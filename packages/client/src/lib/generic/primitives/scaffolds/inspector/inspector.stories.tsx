import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { Inspector, type InspectorProps } from './index';
import {
  ExamplePane,
  ExampleTabsPane,
  inspectorTitle,
} from './inspector.mocks';

// Each variation draws its own pane; the story's args only satisfy the component's type.
const args: InspectorProps = {
  title: inspectorTitle,
  open: true,
  onOpenChange: () => {},
};

const meta = {
  title: 'Design System/Primitives/Scaffolds/Inspector',
  component: Inspector,
  argTypes: kitArgTypes('Inspector'),
  args,
} satisfies Meta<typeof Inspector>;

export default meta;

// The wide column; under wide the same content opens in a Sheet (see Tests/Inspector).
export const Overview: StoryObj<typeof meta> = {
  name: 'Inspector',
  render: () => (
    <Variations>
      <Variation label="Open">
        <ExamplePane />
      </Variation>
      <Variation label="With Actions">
        <ExamplePane actions />
      </Variation>
      <Variation label="Expanded">
        <ExamplePane expanded />
      </Variation>
    </Variations>
  ),
};

// Tabs in place of the title; the ones that do not fit scroll behind the faded edge.
export const Tabs: StoryObj<typeof meta> = {
  render: () => (
    <Variations>
      <Variation label="Tabs">
        <ExampleTabsPane />
      </Variation>
      <Variation label="Overflowing">
        <ExampleTabsPane narrow />
      </Variation>
    </Variations>
  ),
};
