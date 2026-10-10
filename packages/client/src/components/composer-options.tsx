import { LegendList } from '@legendapp/list/react-native';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { listTestIdProps } from '../lib/list-test-id';
import {
  type ComposerConfigurationProps,
  configurationChoices,
} from './composer-configuration';
import { ComposerPopover } from './composer-popover';

const settingsRowEstimate = 44;
const settingsMenuPadding = 8;
const maximumSettingsHeight = 320;
const maximumScreenFraction = 0.6;

type SettingsRow =
  | { id: string; type: 'header'; name: string }
  | {
      id: string;
      type: 'boolean';
      option: Extract<SessionConfigOption, { type: 'boolean' }>;
    }
  | {
      id: string;
      type: 'choice';
      option: Extract<SessionConfigOption, { type: 'select' }>;
      choice: SessionConfigSelectOption;
    };

function settingRows(options: SessionConfigOption[]): SettingsRow[] {
  return options.flatMap((option): SettingsRow[] => {
    if (option.type === 'boolean')
      return [
        {
          id: JSON.stringify(['boolean', option.configId]),
          type: 'boolean',
          option,
        },
      ];
    if (['mode', 'model', 'thought_level'].includes(option.category ?? ''))
      return [];
    return [
      {
        id: JSON.stringify(['header', option.configId]),
        type: 'header',
        name: option.name,
      },
      ...configurationChoices(option).map((choice): SettingsRow => ({
        id: JSON.stringify(['choice', option.configId, choice.value]),
        type: 'choice',
        option,
        choice,
      })),
    ];
  });
}

function SettingRow({
  row,
  onConfigChange,
}: {
  row: SettingsRow;
  onConfigChange: ComposerConfigurationProps['onConfigChange'];
}): React.JSX.Element {
  if (row.type === 'header')
    return <Text className="px-2 pt-1.5 pb-1 type-secondary">{row.name}</Text>;
  const { option } = row;
  const boolean = row.type === 'boolean';
  const selected = boolean
    ? option.currentValue === true
    : option.currentValue === row.choice.value;
  const name = boolean ? option.name : row.choice.name;
  return (
    <Button
      variant="ghost"
      accessibilityLabel={boolean ? name : `${option.name}: ${name}`}
      aria-pressed={selected}
      className="h-auto sm:h-auto min-h-10 px-2 py-2 justify-start rounded-sm"
      onPress={() =>
        onConfigChange(
          option.configId,
          boolean ? !option.currentValue : row.choice.value,
        )
      }
    >
      <Text className="flex-1 font-normal">{name}</Text>
      {boolean ? (
        <Text className="w-8 text-right font-normal text-muted-foreground">
          {selected ? 'On' : 'Off'}
        </Text>
      ) : (
        <View className="w-4 h-4">
          {selected && <Icon name="check" size="sm" />}
        </View>
      )}
    </Button>
  );
}

export function ComposerOptions({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}): React.JSX.Element | null {
  const { height } = useWindowDimensions();
  const rows = settingRows(configuration.configOptions);
  if (!rows.length) return null;
  const menuHeight = Math.min(
    rows.length * settingsRowEstimate + settingsMenuPadding,
    maximumSettingsHeight,
    height * maximumScreenFraction,
  );
  return (
    <ComposerPopover
      label="Session settings"
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Session settings"
          className="h-7 sm:h-7 px-1.5 py-0"
        >
          <Text className="text-xs text-muted-foreground">Settings</Text>
        </Button>
      }
    >
      {() => (
        <View style={{ height: menuHeight }}>
          <LegendList
            {...listTestIdProps('composer-settings-scroll')}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 4 }}
            data={rows}
            keyExtractor={(row) => row.id}
            renderItem={({ item }) => (
              <SettingRow
                row={item}
                onConfigChange={configuration.onConfigChange}
              />
            )}
            estimatedItemSize={settingsRowEstimate}
            recycleItems={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}
    </ComposerPopover>
  );
}
