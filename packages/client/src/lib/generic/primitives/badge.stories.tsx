const variants = ['default', 'secondary', 'destructive', 'outline'] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../../storybook/variations';
import { Badge } from './badge';
import { Text } from './text';

function VariantExamples(): React.JSX.Element {
  return (
    <Variations>
      {variants.map((variant) => (
        <Variation key={variant} label={variant}>
          <View className="flex-row">
            <Badge variant={variant}>
              <Text>Badge</Text>
            </Badge>
          </View>
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Badge',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Badge',
  render: VariantExamples,
};
