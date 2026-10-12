import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { RichTextareaExample } from '../../../../../../mocks/rich-textarea-example';
import { Variation, Variations as VariationList } from '../../../variations';

const longDraft = Array.from(
  { length: 14 },
  (_, index) => `Line ${index + 1} of a long draft`,
).join('\n');

const examples = [
  { label: 'Empty', value: '' },
  { label: 'Bold', value: 'Keep the **phone** readable.' },
  { label: 'Italic', value: 'Keep the _phone_ readable.' },
  { label: 'Strikethrough', value: 'Keep the ~~tablet~~ phone readable.' },
  { label: 'Inline code', value: 'Run `pnpm test` before you push.' },
  {
    label: 'Three lines',
    value: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
  },
  { label: 'Long draft at max height', value: longDraft },
];

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
          <RichTextareaExample initialValue={value} />
        </Variation>
      ))}
    </VariationList>
  ),
};
