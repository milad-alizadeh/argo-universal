import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { Kbd } from './kbd';

const meta = {
  title: 'Design System/Primitives/Content/Kbd',
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Kbd',
  render: () => (
    <VariationList>
      <Variation label="Rename">
        <Kbd keys={['↵']} />
      </Variation>
      <Variation label="Copy link">
        <Kbd keys={['⇧', '⌘', 'C']} />
      </Variation>
    </VariationList>
  ),
};
