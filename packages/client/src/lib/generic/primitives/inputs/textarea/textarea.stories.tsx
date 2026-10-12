import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { Textarea } from './textarea';

const examples: {
  label: string;
  props: React.ComponentProps<typeof Textarea> & { 'aria-invalid'?: boolean };
}[] = [
  { label: 'Empty', props: { placeholder: 'Message' } },
  {
    label: 'Filled',
    props: { defaultValue: 'Hello from Argo.', placeholder: 'Message' },
  },
  { label: 'Read-only', props: { editable: false, placeholder: 'Message' } },
  { label: 'Invalid', props: { 'aria-invalid': true, placeholder: 'Message' } },
];

const meta = {
  title: 'Design System/Primitives/Textarea',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Textarea',
  render: () => (
    <VariationList>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <Textarea {...props} />
        </Variation>
      ))}
    </VariationList>
  ),
};
