import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Slider } from '#primitives/inputs/slider/slider';
import { Switch } from '#primitives/inputs/switch/switch';
import { ListItem } from '#primitives/lists/list-item/list-item';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';

export function EffortControl({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): React.JSX.Element | null {
  const { option, choices, selected } = currentEffort(configuration);
  if (!option || !selected || !choices.length) return null;
  return (
    <ListItem
      title="Effort"
      value={selected.name}
      detail={
        <Slider
          accessibilityLabel="Effort"
          valueLabel={selected.name}
          minimumValue={0}
          maximumValue={Math.max(1, choices.length - 1)}
          step={1}
          value={choices.indexOf(selected)}
          onValueChange={(index) => {
            const choice = choices[Math.round(index)];
            if (choice)
              configuration.onConfigChange(option.configId, choice.value);
          }}
        />
      }
    />
  );
}

export function SwitchOptions({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): React.JSX.Element {
  if (Platform.OS !== 'web')
    return (
      <>
        {switches(configuration).map((option) => (
          <ListItem
            key={option.configId}
            title={option.name}
            control={
              <Switch
                accessibilityLabel={option.name}
                checked={option.currentValue}
                aria-checked={option.currentValue}
                onCheckedChange={(checked) =>
                  configuration.onConfigChange(option.configId, checked)
                }
              />
            }
          />
        ))}
      </>
    );
  return (
    <>
      {switches(configuration).map((option) => (
        <ListItem
          key={option.configId}
          title={option.name}
          role="switch"
          checked={option.currentValue}
          aria-checked={option.currentValue}
          disclosure={false}
          onPress={() =>
            configuration.onConfigChange(option.configId, !option.currentValue)
          }
          accessory={
            <View
              pointerEvents="none"
              aria-hidden
              importantForAccessibility="no-hide-descendants"
            >
              <Switch
                checked={option.currentValue}
                aria-checked={option.currentValue}
                onCheckedChange={() => {}}
              />
            </View>
          }
        />
      ))}
    </>
  );
}
