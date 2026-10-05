import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Textarea } from './textarea';

const meta = {
  title: 'Design System/Primitives/Textarea',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Textarea',
  render: () => (
    <Variations>
      <Variation label="Empty">
        <Textarea placeholder="Message" />
      </Variation>
      <Variation label="Filled">
        <Textarea defaultValue="Hello from Argo." placeholder="Message" />
      </Variation>
      <Variation label="Read-only">
        <Textarea editable={false} placeholder="Message" />
      </Variation>
      <Variation label="Invalid">
        <Textarea aria-invalid placeholder="Message" />
      </Variation>
    </Variations>
  ),
};
