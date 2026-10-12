import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import {
  Text,
  TextClassContext,
} from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../symbols/icon';
import { iconNames, iconSymbols } from '../../../symbols/icon-names';
import { type IconRole, useIconPixels } from '../../../symbols/icon-role';
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

const roles: IconRole[] = [
  'body',
  'secondary',
  'control',
  'mark',
  'row',
  'action',
  'nav',
  'title',
];

function RoleSample({ role }: { role: IconRole }): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <Icon name="add" role={role} />
      <Text role="secondary">{`${role} ${useIconPixels(role)}`}</Text>
    </View>
  );
}

export const Variations: Story = {
  name: 'Icon',
  render: () => (
    <VariationList>
      <Variation label="Every Argo icon">
        <View className="flex-row flex-wrap gap-x-2 gap-y-3">
          {iconNames.map((name) => (
            <View key={name} className="w-28 items-center gap-1">
              <Icon name={name} role="control" />
              <Text role="secondary">{name}</Text>
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
          {roles.map((role) => (
            <RoleSample key={role} role={role} />
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
      <TextClassContext.Provider value="type-secondary">
        <View className="flex-row gap-4 pb-2">
          <Text className="w-36">Name</Text>
          <Text className="w-10">SF</Text>
          <Text className="w-10">Material</Text>
          <Text className="w-64">SF Symbol</Text>
          <Text>Material Symbol</Text>
        </View>
      </TextClassContext.Provider>
      {iconNames.map((name) => (
        <View key={name} className="flex-row items-center gap-4">
          <Text className="w-36">{name}</Text>
          <View className="w-10">
            <SymbolImagesProvider render={renderStorybookSymbol}>
              <Icon name={name} role="action" testID={`sf-${name}`} />
            </SymbolImagesProvider>
          </View>
          <View className="w-10">
            <Icon name={name} role="action" testID={`material-${name}`} />
          </View>
          <Text role="code" className="w-64 text-muted-foreground">
            {iconSymbols[name].sf}
          </Text>
          <Text role="code" className="text-muted-foreground">
            {iconSymbols[name].material}
          </Text>
        </View>
      ))}
    </View>
  ),
};
