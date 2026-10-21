import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { SearchField } from './search-field';
import { SearchFieldExample } from './search-field-example.mocks';

const meta = {
  title: 'Design System/Primitives/Inputs/SearchField',
  component: SearchField,
  argTypes: kitArgTypes('SearchField'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

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
