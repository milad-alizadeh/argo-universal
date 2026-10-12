import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ErrorToastExample } from '../../../../../../mocks/toast-mock';
import { Variation, Variations as VariationList } from '../../../variations';

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
