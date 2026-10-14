import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { ErrorToastExample } from './toast-example.mocks';

const meta = { title: 'Design System/Primitives/Toast' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Toast',
  render: () => (
    <VariationList>
      <Variation label="Error">
        <ErrorToastExample />
      </Variation>
    </VariationList>
  ),
};
