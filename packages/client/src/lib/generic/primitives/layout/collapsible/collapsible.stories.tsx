import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Variation, Variations as VariationList } from '../../../variations';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from './collapsible';

function CollapsibleExample({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}): React.JSX.Element {
  return (
    <Collapsible defaultOpen={defaultOpen} className="w-full">
      <CollapsibleHeader icon="read" label="Read 6 files, searched 2 times" />
      <CollapsibleContent className="pt-2">
        <Text>Content sits 8 below the trigger.</Text>
      </CollapsibleContent>
    </Collapsible>
  );
}

const meta = {
  title: 'Design System/Primitives/Layout/Collapsible',
  component: Collapsible,
  argTypes: kitArgTypes('Collapsible'),
  tags: ['third-party'],
} satisfies Meta;

export default meta;

type Story = StoryObj;

// Hover is live: point at either header on a desktop viewport. Phones have no hover.
export const Variations: Story = {
  name: 'Collapsible',
  render: () => (
    <VariationList>
      <Variation label="Closed">
        <CollapsibleExample />
      </Variation>
      <Variation label="Open">
        <CollapsibleExample defaultOpen />
      </Variation>
    </VariationList>
  ),
};
