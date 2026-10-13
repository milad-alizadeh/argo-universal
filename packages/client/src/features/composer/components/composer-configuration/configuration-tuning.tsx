import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Slider } from '#primitives/inputs/slider/slider';
import { Switch } from '#primitives/inputs/switch/switch';
import { ListItem } from '#primitives/lists/list-item/list-item';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';
interface TuningProps {
  configuration: ComposerConfigurationProps;
}
type EffortProps = TuningProps & { effort: ReturnType<typeof currentEffort> };
type BooleanOption = Extract<SessionConfigOption, { type: 'boolean' }>;
interface SwitchProps extends TuningProps {
  option: BooleanOption;
}
export function EffortControl(props: TuningProps): React.JSX.Element | null {
  const effort = currentEffort(props.configuration);
  if (!effort.option || !effort.selected) return null;
  return (
    <ListItem
      title="Effort"
      value={effort.selected.name}
      detail={<EffortSlider {...props} effort={effort} />}
    />
  );
}
function EffortSlider(props: EffortProps): React.JSX.Element {
  return <Slider {...effortSliderProps(props)} />;
}
function effortSliderProps({
  configuration,
  effort,
}: EffortProps): React.ComponentProps<typeof Slider> {
  return {
    accessibilityLabel: 'Effort',
    valueLabel: selectedEffortLabel(effort),
    minimumValue: 0,
    maximumValue: Math.max(1, effort.choices.length - 1),
    step: 1,
    value: effort.selected ? effort.choices.indexOf(effort.selected) : 0,
    onValueChange: (index) => selectEffort({ configuration, effort }, index),
  };
}
function selectEffort(
  { configuration, effort }: EffortProps,
  index: number,
): void {
  const choice = effort.choices[Math.round(index)];
  if (choice && effort.option)
    configuration.onConfigChange(effort.option.configId, choice.value);
}
export function SwitchOptions(props: TuningProps): React.JSX.Element {
  return (
    <>
      {switches(props.configuration).map((option) => (
        <ConfigurationSwitch key={option.configId} {...props} option={option} />
      ))}
    </>
  );
}
function ConfigurationSwitch(props: SwitchProps): React.JSX.Element {
  return Platform.OS === 'web' ? (
    <WebConfigurationSwitch {...props} />
  ) : (
    <NativeConfigurationSwitch {...props} />
  );
}
function NativeConfigurationSwitch(props: SwitchProps): React.JSX.Element {
  return (
    <ListItem
      title={props.option.name}
      control={<NativeSwitchControl {...props} />}
    />
  );
}
function NativeSwitchControl({
  configuration,
  option,
}: SwitchProps): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel={option.name}
      checked={option.currentValue}
      aria-checked={option.currentValue}
      onCheckedChange={(checked) =>
        configuration.onConfigChange(option.configId, checked)
      }
    />
  );
}
function WebConfigurationSwitch(props: SwitchProps): React.JSX.Element {
  return (
    <ListItem
      {...webSwitchRowProps(props)}
      accessory={<DecorativeSwitch option={props.option} />}
    />
  );
}
function webSwitchRowProps({
  configuration,
  option,
}: SwitchProps): React.ComponentProps<typeof ListItem> {
  return {
    title: option.name,
    role: 'switch',
    checked: option.currentValue,
    'aria-checked': option.currentValue,
    disclosure: false,
    onPress: () =>
      configuration.onConfigChange(option.configId, !option.currentValue),
  };
}
function DecorativeSwitch({
  option,
}: {
  option: BooleanOption;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <DecorativeSwitchControl option={option} />
    </View>
  );
}
function DecorativeSwitchControl({
  option,
}: {
  option: BooleanOption;
}): React.JSX.Element {
  return (
    <Switch
      tabIndex={-1}
      checked={option.currentValue}
      aria-checked={option.currentValue}
      onCheckedChange={ignoreDecorativeChange}
    />
  );
}
function ignoreDecorativeChange(): void {}

function selectedEffortLabel(effort: ReturnType<typeof currentEffort>): string {
  return effort.selected?.name ?? '';
}
