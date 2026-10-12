const variants = ['default', 'secondary', 'destructive', 'outline'] as const;
const tones = ['muted', 'success', 'warning', 'destructive'] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../variations';
import { Badge } from './badge';
import { Text } from './text';

function VariantExamples(): React.JSX.Element {
  return (
    <VariationList>
      {variants.map((variant) => (
        <Variation key={variant} label={variant}>
          <View className="flex-row">
            <Badge variant={variant}>
              <Text>Badge</Text>
            </Badge>
          </View>
        </Variation>
      ))}
      {tones.map((tone) => (
        <Variation key={tone} label={`tone ${tone}`}>
          <View className="flex-row">
            <Badge tone={tone}>
              <Text>Ready</Text>
            </Badge>
          </View>
        </Variation>
      ))}
    </VariationList>
  );
}

const meta = {
  title: 'Design System/Primitives/Badge',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Badge',
  render: VariantExamples,
};
