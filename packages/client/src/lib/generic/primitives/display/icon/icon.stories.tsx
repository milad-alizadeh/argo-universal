import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../symbols/icon';
import { iconNames, iconSymbols } from '../../../symbols/icon-names';
import { iconRoleNames } from '../../../symbols/icon-role';
import { SymbolImagesProvider } from '../../../symbols/symbol-images';
import { Variation, Variations as VariationList } from '../../../variations';
import { IconButton } from '../../buttons/icon-button/icon-button';
import { FilledSymbols } from './filled-symbols.mocks';
import { renderStorybookSymbol } from './sf-symbol-images.mocks';

const meta = {
  title: 'Design System/Primitives/Icon',
  component: Icon,
  args: { name: 'add', role: 'control' },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Icon',
  render: () => (
    <VariationList>
      <Variation label="Every Argo icon">
        <View className="flex-row flex-wrap gap-x-2 gap-y-3">
          {iconNames.map((name) => (
            <View key={name} className="w-28 items-center gap-1">
              <Icon name={name} role="control" />
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
      <Variation label="Roles: each steps to its phone size below the wide breakpoint">
        <View className="flex-row flex-wrap items-end gap-4">
          {iconRoleNames.map((role) => (
            <View key={role} className="items-center gap-1">
              <Icon name="add" role={role} />
              <Text className="text-xs leading-4 text-muted-foreground">
                {role}
              </Text>
            </View>
          ))}
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
            <Icon
              key={className}
              name="warning"
              role="control"
              className={className}
            />
          ))}
        </View>
      </Variation>
    </VariationList>
  ),
};

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
              <Icon name={name} role="action" testID={`sf-${name}`} />
            </SymbolImagesProvider>
          </View>
          <View className="w-10">
            <Icon name={name} role="action" testID={`material-${name}`} />
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
