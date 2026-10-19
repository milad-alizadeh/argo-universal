import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../variations';
import { Inspector, type InspectorProps } from './index';
import { ExamplePane, inspectorTitle } from './inspector.mocks';

// Each variation draws its own pane; the story's args only satisfy the component's type.
const args: InspectorProps = {
  title: inspectorTitle,
  open: true,
  onOpenChange: () => {},
};

const meta = {
  title: 'Design System/Primitives/Scaffolds/Inspector',
  component: Inspector,
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
