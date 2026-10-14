import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { SearchField } from './search-field';
import { SearchFieldExample } from './search-field-example.mocks';

const meta = { title: 'Design System/Primitives/SearchField' } satisfies Meta;

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
      {Platform.OS === 'android' && <DockedVariations />}
    </VariationList>
  ),
};

// Only Android docks a search bar at the top of a list, so only its preview shows these.
function DockedVariations(): React.JSX.Element {
  return (
    <>
      <Variation label="Docked empty">
        <DockedExample initial="" />
      </Variation>
      <Variation label="Docked query">
        <DockedExample initial="review" />
      </Variation>
    </>
  );
}

function DockedExample({ initial }: { initial: string }): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return (
    <SearchField
      appearance="docked"
      label="Search Sessions"
      leading="menu"
      value={value}
      onChangeText={setValue}
    />
  );
}
