import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../storybook/variations';
import { Input } from './input';

const examples: {
  label: string;
  props: React.ComponentProps<typeof Input> & { 'aria-invalid'?: boolean };
}[] = [
  { label: 'Empty', props: { placeholder: 'Email' } },
  {
    label: 'Filled',
    props: { defaultValue: 'hello@example.com', placeholder: 'Email' },
  },
  { label: 'Read-only', props: { editable: false, placeholder: 'Email' } },
  { label: 'Invalid', props: { 'aria-invalid': true, placeholder: 'Email' } },
  {
    label: 'Secure',
    props: { secureTextEntry: true, defaultValue: 'password' },
  },
];

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
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <Input {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
