import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { IconWeight } from 'phosphor-react-native';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Icon } from './Icon';

const weights: IconWeight[] = [
  'thin',
  'light',
  'regular',
  'bold',
  'fill',
  'duotone',
];

const meta = {
  title: 'Design System/Components/Icon',
  component: Icon,
  args: { as: PlusIcon },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Icon',
  render: () => (
    <Variations>
      <Variation label="Inside icon buttons">
        <View className="flex-row gap-3">
          {[
            { label: 'Add', icon: PlusIcon },
            { label: 'Confirm', icon: CheckIcon },
            { label: 'Search', icon: MagnifyingGlassIcon },
          ].map(({ label, icon }) => (
            <Button key={label} size="icon" aria-label={label}>
              <Icon as={icon} />
            </Button>
          ))}
        </View>
      </Variation>
      <Variation label="Sizes: 16, 24 and 32">
        <View className="flex-row items-center gap-3">
          {[16, 24, 32].map((size) => (
            <Icon key={size} as={PlusIcon} size={size} />
          ))}
        </View>
      </Variation>
      <Variation label={`Weights: ${weights.join(', ')}`}>
        <View className="flex-row items-center gap-3">
          {weights.map((weight) => (
            <Icon key={weight} as={HeartIcon} weight={weight} />
          ))}
        </View>
      </Variation>
      <Variation label="Colors: foreground, muted, primary and destructive">
        <View className="flex-row items-center gap-3">
          {[
            'text-foreground',
            'text-muted-foreground',
            'text-primary',
            'text-destructive',
          ].map((className) => (
            <Icon key={className} as={HeartIcon} className={className} />
          ))}
        </View>
      </Variation>
    </Variations>
  ),
};
