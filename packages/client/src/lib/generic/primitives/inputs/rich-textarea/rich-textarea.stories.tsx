import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
import { RichTextarea } from './rich-textarea';

const longDraft = Array.from(
  { length: 14 },
  (_, index) => `Line ${index + 1} of a long draft`,
).join('\n');

const examples = [
  { label: 'Empty', value: '' },
  {
    label: 'Three lines',
    value: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
  },
  { label: 'Long draft at max height', value: longDraft },
];

type ExampleProps = { initialValue: string };

function Example({ initialValue }: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  return (
    <RichTextarea
      accessibilityLabel="Message"
      placeholder="Message the Agent…"
      value={value}
      onChangeText={setValue}
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
      {examples.map(({ label, value }) => (
        <Variation key={label} label={label}>
          <Example initialValue={value} />
        </Variation>
      ))}
    </VariationList>
  ),
};
