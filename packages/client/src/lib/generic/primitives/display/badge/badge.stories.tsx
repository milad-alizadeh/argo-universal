const variants = ['default', 'secondary'] as const;

const tones = ['muted', 'info', 'success', 'warning', 'destructive'] as const;

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Text } from '../text/text';
import { Badge } from './badge';

function VariantExamples(): React.JSX.Element {
  return (
    <VariationList>
      {variants.map((variant) => (
        <VariantExample key={variant} variant={variant} />
      ))}
      {tones.map((tone) => (
        <ToneExample key={tone} tone={tone} />
      ))}
    </VariationList>
  );
}

function VariantExample(props: {
  variant: (typeof variants)[number];
}): React.JSX.Element {
  return (
    <Variation label={props.variant}>
      <View className="flex-row">
        <Badge variant={props.variant}>
          <Text>Badge</Text>
        </Badge>
      </View>
    </Variation>
  );
}

function ToneExample(props: {
  tone: (typeof tones)[number];
}): React.JSX.Element {
  return (
    <Variation label={`tone ${props.tone}`}>
      <View className="flex-row">
        <Badge tone={props.tone}>
          <Text>Ready</Text>
        </Badge>
      </View>
    </Variation>
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
