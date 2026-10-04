import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Textarea } from './textarea';

function ValueExamples() {
  return (
    <Variations>
      {['', 'hello@example.com'].map((value) => (
        <Variation key={value} label={value ? 'Filled' : 'Empty'}>
          <Textarea defaultValue={value} placeholder="Email" />
        </Variation>
      ))}
    </Variations>
  );
}
function EditableExamples() {
  return (
    <Variations>
      {[true, false].map((editable) => (
        <Variation key={String(editable)} label={String(editable)}>
          <Textarea editable={editable} placeholder="Email" />
        </Variation>
      ))}
    </Variations>
  );
}
function InvalidExamples() {
  return (
    <Variations>
      {[false, true].map((invalid) => (
        <Variation key={String(invalid)} label={String(invalid)}>
          <Textarea aria-invalid={invalid} placeholder="Email" />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Textarea',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        Value: ValueExamples,
        Editable: EditableExamples,
        Invalid: InvalidExamples,
      }}
    />
  ),
};
export const Value: Story = { render: ValueExamples };
export const Editable: Story = { render: EditableExamples };
export const Invalid: Story = { render: InvalidExamples };
