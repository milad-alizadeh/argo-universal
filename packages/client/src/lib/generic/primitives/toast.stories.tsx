import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ErrorToastExample } from '../../../../mocks/toast-mock';
import { Variation, Variations } from '../variations';

const meta = { title: 'Design System/Primitives/Toast' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Toast',
  render: () => (
    <Variations>
      <Variation label="Error">
        <ErrorToastExample />
      </Variation>
    </Variations>
  ),
};
