import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { SelectedCheck } from '#primitives/display/selected-check';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { Switch } from '#primitives/inputs/switch/switch';
import { ListItem } from '#primitives/lists/list-item/list-item';
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
      tabIndex={Platform.OS === 'web' ? -1 : undefined}
      checked={option.currentValue}
      onCheckedChange={(checked) => onChange(option.configId, checked)}
    />
  );
}

function BooleanSetting(props: BooleanProps): React.JSX.Element {
  const Setting = Platform.OS === 'web' ? WebBoolean : NativeBoolean;

  return <Setting {...props} />;
}

function NativeBoolean(props: BooleanProps): React.JSX.Element {
  return (
    <ListItem
      title={props.option.name}
      disclosure={false}
      control={<BooleanToggle {...props} />}
    />
  );
}

function WebBoolean(props: BooleanProps): React.JSX.Element {
  return (
    <ListItem
      title={props.option.name}
      role="switch"
      checked={props.option.currentValue}
      aria-checked={props.option.currentValue}
      disclosure={false}
      onPress={() =>
        props.onChange(props.option.configId, !props.option.currentValue)
      }
      accessory={<SwitchAccessory {...props} />}
    />
  );
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

export function SettingSection({
  option,
  onChange,
}: SettingProps): React.JSX.Element {
  if (option.type === 'boolean')
    return (
      <FieldSection>
        <BooleanSetting option={option} onChange={onChange} />
      </FieldSection>
    );

  return <SelectSection option={option} onChange={onChange} />;
}

type SelectOption = Extract<Option, { type: 'select' }>;

interface SelectProps {
  option: SelectOption;
  onChange: Change;
}

interface SelectChoiceProps extends SelectProps {
  choice: ReturnType<typeof configurationChoices>[number];
}

function SelectSection(props: SelectProps): React.JSX.Element {
  return (
    <FieldSection title={props.option.name}>
      {configurationChoices(props.option).map((choice) => (
        <SelectSetting key={choice.value} {...props} choice={choice} />
      ))}
    </FieldSection>
  );
}

function SelectSetting({
  option,
  choice,
  onChange,
}: SelectChoiceProps): React.JSX.Element {
  const selected = option.currentValue === choice.value;

  return (
    <ListItem
      title={choice.name}
      accessibilityLabel={`${option.name}: ${choice.name}`}
      {...choiceInteractionProps(selected)}
      {...choiceActionProps({ option, choice, onChange }, selected)}
    />
  );
}

function choiceInteractionProps(
  selected: boolean,
): Pick<
  React.ComponentProps<typeof ListItem>,
  'role' | 'disclosure' | 'selected'
> {
  return { role: 'button', disclosure: false, selected };
}

function choiceActionProps(
  { option, choice, onChange }: SelectChoiceProps,
  selected: boolean,
): Pick<React.ComponentProps<typeof ListItem>, 'onPress' | 'accessory'> {
  return {
    onPress: () => onChange(option.configId, choice.value),
    accessory: selected ? <SelectedCheck /> : undefined,
  };
}
