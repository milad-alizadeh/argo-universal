import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Switch } from '#primitives/inputs/switch';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';

type Option = SessionConfigOption;

type Change = ComposerConfigurationProps['onConfigChange'];

interface SettingProps {
  option: Option;
  onChange: Change;
}

type BooleanOption = Extract<Option, { type: 'boolean' }>;

interface BooleanProps {
  option: BooleanOption;
  onChange: Change;
}

function BooleanToggle({ option, onChange }: BooleanProps): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel={option.name}
      decorative={Platform.OS === 'web'}
      value={option.currentValue}
      onValueChange={(checked) => onChange(option.configId, checked)}
    />
  );
}

function BooleanSetting(props: BooleanProps): React.JSX.Element {
  const Setting = Platform.OS === 'web' ? WebBoolean : NativeBoolean;

  return <Setting {...props} />;
}

function NativeBoolean(props: BooleanProps): React.JSX.Element {
  return (
    <GroupedListItem
      label={props.option.name}
      disclosure={false}
      control={<BooleanToggle {...props} />}
    />
  );
}

function WebBoolean(props: BooleanProps): React.JSX.Element {
  return (
    <GroupedListItem
      {...webSwitchRow(props)}
      accessory={<SwitchAccessory {...props} />}
    />
  );
}

// GroupedListItem reports `checked` as the switch's aria-checked on the web.
function webSwitchRow(props: BooleanProps): GroupedListItemProps {
  return {
    label: props.option.name,
    accessibilityRole: 'switch',
    checked: props.option.currentValue,
    disclosure: false,
    onPress: () =>
      props.onChange(props.option.configId, !props.option.currentValue),
  };
}

function SwitchAccessory(props: BooleanProps): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <BooleanToggle {...props} />
    </View>
  );
}

function booleanSection(props: BooleanProps): React.JSX.Element {
  return (
    <GroupedListSection key={props.option.configId}>
      <BooleanSetting {...props} />
    </GroupedListSection>
  );
}

// GroupedList takes each section as a direct child, so this is called rather than rendered.
export function settingSection({
  option,
  onChange,
}: SettingProps): React.JSX.Element {
  if (option.type === 'boolean') return booleanSection({ option, onChange });

  return (
    <GroupedListSection key={option.configId} title={option.name}>
      {selectSettings({ option, onChange })}
    </GroupedListSection>
  );
}

function selectSettings(props: SelectProps): React.JSX.Element[] {
  return configurationChoices(props.option).map((choice) => (
    <SelectSetting key={choice.value} {...props} choice={choice} />
  ));
}

type SelectOption = Extract<Option, { type: 'select' }>;

interface SelectProps {
  option: SelectOption;
  onChange: Change;
}

interface SelectChoiceProps extends SelectProps {
  choice: ReturnType<typeof configurationChoices>[number];
}

function SelectSetting({
  option,
  choice,
  onChange,
}: SelectChoiceProps): React.JSX.Element {
  const selected = option.currentValue === choice.value;

  return (
    <GroupedListItem
      label={choice.name}
      accessibilityLabel={`${option.name}: ${choice.name}`}
      {...choiceInteractionProps(selected)}
      {...choiceActionProps({ option, choice, onChange }, selected)}
    />
  );
}

function choiceInteractionProps(
  selected: boolean,
): Pick<
  React.ComponentProps<typeof GroupedListItem>,
  'accessibilityRole' | 'disclosure' | 'selected'
> {
  return { accessibilityRole: 'button', disclosure: false, selected };
}

function choiceActionProps(
  { option, choice, onChange }: SelectChoiceProps,
  selected: boolean,
): Pick<React.ComponentProps<typeof GroupedListItem>, 'onPress' | 'accessory'> {
  return {
    onPress: () => onChange(option.configId, choice.value),
    accessory: selected ? <SelectedCheck /> : undefined,
  };
}
