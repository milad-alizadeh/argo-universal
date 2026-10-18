import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { SearchFieldExample } from './search-field-example.mocks';

const meta = {
  title: 'Design System/Primitives/Inputs/SearchField',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'SearchField',
  render: () => (
    <VariationList>
      <Variation label="At rest">
        <SearchFieldExample />
      </Variation>
      <Variation label="Searching">
        <SearchFieldExample initial="review" />
      </Variation>
    </VariationList>
  ),
};
