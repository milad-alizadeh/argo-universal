import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
import { RichTextarea } from './rich-textarea';

const longDraft = Array.from(
  { length: 14 },
  (_, index) => `Line ${index + 1} of a long draft`,
).join('\n');

const examples = [
  { label: 'Empty', value: '', editable: true },
  { label: 'Filled', value: 'Match the **spacing**.', editable: true },
  {
    label: 'Three lines',
    value: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
    editable: true,
  },
  { label: 'Read-only', value: 'Match the spacing.', editable: false },
  { label: 'Long draft at max height', value: longDraft, editable: true },
];

type ExampleProps = { initialValue: string; editable: boolean };

function Example({ initialValue, editable }: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const field = { value, onChangeText: setValue, editable };
  return (
    <RichTextarea
      accessibilityLabel="Message"
      placeholder="Message the Agent…"
      {...field}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/RichTextarea',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'RichTextarea',
  render: () => (
    <VariationList>
      {examples.map(({ label, value, editable }) => (
        <Variation key={label} label={label}>
          <Example initialValue={value} editable={editable} />
        </Variation>
      ))}
    </VariationList>
  ),
};
