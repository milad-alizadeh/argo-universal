import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

function VariantExamples() {
  return (
    <Variations>
      {(
        [
          'default',
          'destructive',
          'outline',
          'secondary',
          'ghost',
          'link',
        ] as const
      ).map((variant) => (
        <Variation key={variant} label={variant}>
          <View className="flex-row">
            <Button variant={variant}>
              <Text>Button</Text>
            </Button>
          </View>
        </Variation>
      ))}
    </Variations>
  );
}
function SizeExamples() {
  return (
    <Variations>
      {(['default', 'sm', 'lg', 'icon'] as const).map((size) => (
        <Variation key={size} label={size}>
          <View className="flex-row">
            <Button
              size={size}
              accessibilityLabel={size === 'icon' ? 'Add' : 'Button'}
            >
              {size === 'icon' ? <Icon as={Plus} /> : <Text>Button</Text>}
            </Button>
          </View>
        </Variation>
      ))}
    </Variations>
  );
}
function DisabledExamples() {
  return (
    <Variations>
      {[false, true].map((disabled) => (
        <Variation key={String(disabled)} label={String(disabled)}>
          <View className="flex-row">
            <Button disabled={disabled}>
              <Text>Button</Text>
            </Button>
          </View>
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Button',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        Variant: VariantExamples,
        Size: SizeExamples,
        Disabled: DisabledExamples,
      }}
    />
  ),
};
export const Variant: Story = { render: VariantExamples };
export const Size: Story = { render: SizeExamples };
export const Disabled: Story = { render: DisabledExamples };
