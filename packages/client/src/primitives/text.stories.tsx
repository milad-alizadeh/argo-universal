const variants = [
  'default',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'blockquote',
  'code',
  'lead',
  'large',
  'small',
  'muted',
] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Text } from './text';

function VariantExamples(): React.JSX.Element {
  return (
    <Variations>
      {variants.map((variant) => (
        <Variation key={variant} label={variant}>
          <Text variant={variant}>
            The quick brown fox jumps over the lazy dog.
          </Text>
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Text',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Text',
  render: VariantExamples,
};
