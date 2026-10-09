import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Icon } from '../lib/icon';
import { iconNames } from '../lib/icon-names';

const meta = {
  title: 'Design System/Components/Icon',
  component: Icon,
  args: { name: 'add' },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Icon',
  render: () => (
    <Variations>
      <Variation label="Every Argo icon">
        <View className="flex-row flex-wrap gap-x-2 gap-y-3">
          {iconNames.map((name) => (
            <View key={name} className="w-28 items-center gap-1">
              <Icon name={name} />
              <Text className="text-xs leading-4 text-muted-foreground">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Variation>
      <Variation label="Inside icon buttons">
        <View className="flex-row gap-3">
          {(
            [
              { label: 'Add', icon: 'add' },
              { label: 'Confirm', icon: 'check' },
              { label: 'Search', icon: 'search' },
            ] as const
          ).map(({ label, icon }) => (
            <Button key={label} size="icon" aria-label={label}>
              <Icon name={icon} />
            </Button>
          ))}
        </View>
      </Variation>
      <Variation label="Sizes: sm 12 for carets, md 16 by default, lg 20 for phone shell controls">
        <View className="flex-row items-center gap-3">
          <Icon name="chevron-right" size="sm" />
          <Icon name="add" size="md" />
          <Icon name="add" size="lg" />
        </View>
      </Variation>
      <Variation label="Filled: selected shell sections draw the SF fill; Material stays outlined">
        <View className="flex-row items-center gap-3">
          {(['sessions', 'issue', 'atlas', 'settings'] as const).map((name) => (
            <Icon key={name} name={name} size="lg" filled />
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
            <Icon key={className} name="warning" className={className} />
          ))}
        </View>
      </Variation>
    </Variations>
  ),
};
