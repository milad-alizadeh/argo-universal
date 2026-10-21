import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from './collapsible';

const disclosure = (
  <>
    <CollapsibleHeader icon="read" label="Read 6 files, searched 2 times" />
    <CollapsibleContent className="pt-2">
      <Text>Content sits 8 below the trigger.</Text>
    </CollapsibleContent>
  </>
);

const meta = {
  title: 'Design System/Primitives/Layout/Collapsible',
  component: Collapsible,
  argTypes: kitArgTypes('Collapsible'),
  args: { className: 'w-full', children: disclosure },
  tags: ['third-party'],
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

// Hover is live: point at the header on a desktop viewport. Phones have no hover.
export const Closed: Story = { args: { defaultOpen: false } };

export const Open: Story = { args: { defaultOpen: true } };
