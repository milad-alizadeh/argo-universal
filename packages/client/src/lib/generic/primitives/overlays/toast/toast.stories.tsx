import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations as VariationList } from '../../../variations';
import { ActionToastExample, ErrorToastExample } from './toast-example.mocks';

const meta = {
  title: 'Design System/Primitives/Overlays/Toast',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Toast',
  render: () => (
    <VariationList>
      <Variation label="Error">
        <ErrorToastExample />
      </Variation>
      <Variation label="With action (web)">
        <ActionToastExample onUndo={action('undo')} />
      </Variation>
    </VariationList>
  ),
};
