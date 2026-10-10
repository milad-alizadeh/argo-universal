import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { Input } from './input';

const meta = {
  title: 'Design System/Primitives/Input',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Input',
  render: () => (
    <Variations>
      <Variation label="Empty">
        <Input placeholder="Email" />
      </Variation>
      <Variation label="Filled">
        <Input defaultValue="hello@example.com" placeholder="Email" />
      </Variation>
      <Variation label="Read-only">
        <Input editable={false} placeholder="Email" />
      </Variation>
      <Variation label="Invalid">
        <Input aria-invalid placeholder="Email" />
      </Variation>
      <Variation label="Secure">
        <Input secureTextEntry defaultValue="password" />
      </Variation>
    </Variations>
  ),
};
