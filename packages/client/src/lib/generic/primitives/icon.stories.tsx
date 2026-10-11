import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../symbols/icon';
import { iconNames, iconSymbols } from '../symbols/icon-names';
import { SymbolImagesProvider } from '../symbols/symbol-images';
import { Variation, Variations } from '../variations';
import { IconButton } from './icon-button';
import { renderStorybookSymbol } from './sf-symbol-images.mocks';

const meta = {
  title: 'Design System/Primitives/Icon',
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
            <IconButton
              key={label}
              aria-label={label}
              icon={icon}
              accessibilityLabel={label}
              size="md"
              variant="filled"
            />
          ))}
        </View>
      </Variation>
      <Variation label="Sizes: xs 12, sm 16 (default), md 20, lg 24">
        <View className="flex-row items-center gap-3">
          <Icon name="chevron-right" size="xs" />
          <Icon name="add" size="sm" />
          <Icon name="add" size="md" />
          <Icon name="add" size="lg" />
        </View>
      </Variation>
      <Variation label="Fill follows selection on every platform">
        <FilledSymbols />
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

function FilledSymbols(): React.JSX.Element {
  const [filled, setFilled] = useState(false);
  return (
    <View className="gap-3">
      <Button
        onPress={() => setFilled(!filled)}
        label={filled ? 'Show outlined icons' : 'Show filled icons'}
      />
      <View className="flex-row items-center gap-3">
        {(
          [
            'sessions',
            'issue',
            'atlas',
            'settings',
            'fast-mode',
            'voice',
            'failed',
            'permission',
          ] as const
        ).map((name) => (
          <Icon
            key={name}
            name={name}
            size="md"
            filled={filled}
            testID={`fill-${name}`}
          />
        ))}
      </View>
    </View>
  );
}

// SF is drawn by this Mac through Storybook's dev server, so the SF column is empty off macOS.
export const SfAndMaterial: Story = {
  name: 'SF and Material',
  render: () => (
    <View className="gap-1 p-4">
      <View className="flex-row gap-4 pb-2">
        <Text className="w-36 text-xs text-muted-foreground">Name</Text>
        <Text className="w-10 text-xs text-muted-foreground">SF</Text>
        <Text className="w-10 text-xs text-muted-foreground">Material</Text>
        <Text className="w-64 text-xs text-muted-foreground">SF Symbol</Text>
        <Text className="text-xs text-muted-foreground">Material Symbol</Text>
      </View>
      {iconNames.map((name) => (
        <View key={name} className="flex-row items-center gap-4">
          <Text className="w-36 text-sm">{name}</Text>
          <View className="w-10">
            <SymbolImagesProvider render={renderStorybookSymbol}>
              <Icon name={name} size="md" testID={`sf-${name}`} />
            </SymbolImagesProvider>
          </View>
          <View className="w-10">
            <Icon name={name} size="md" testID={`material-${name}`} />
          </View>
          <Text className="w-64 font-mono text-xs text-muted-foreground">
            {iconSymbols[name].sf}
          </Text>
          <Text className="font-mono text-xs text-muted-foreground">
            {iconSymbols[name].material}
          </Text>
        </View>
      ))}
    </View>
  ),
};
