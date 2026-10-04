import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Input } from './input';

function ValueExamples() {
  return (
    <Variations>
      {['', 'hello@example.com'].map((value) => (
        <Variation key={value} label={value ? 'Filled' : 'Empty'}>
          <Input defaultValue={value} placeholder="Email" />
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
          <Input editable={editable} placeholder="Email" />
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
          <Input aria-invalid={invalid} placeholder="Email" />
        </Variation>
      ))}
    </Variations>
  );
}
function SecureTextEntryExamples() {
  return (
    <Variations>
      {[false, true].map((secureTextEntry) => (
        <Variation
          key={String(secureTextEntry)}
          label={String(secureTextEntry)}
        >
          <Input secureTextEntry={secureTextEntry} defaultValue="password" />
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Input',
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
        SecureTextEntry: SecureTextEntryExamples,
      }}
    />
  ),
};
export const Value: Story = { render: ValueExamples };
export const Editable: Story = { render: EditableExamples };
export const Invalid: Story = { render: InvalidExamples };
export const SecureTextEntry: Story = { render: SecureTextEntryExamples };
