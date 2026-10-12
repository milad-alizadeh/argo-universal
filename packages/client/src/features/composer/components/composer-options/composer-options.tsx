import { LegendList } from '@legendapp/list/react-native';
import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { Button } from '#primitives/buttons/button/button';
import { SelectedCheck } from '#primitives/display/selected-check';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { Switch } from '#primitives/inputs/switch/switch';
import { ListItem } from '#primitives/lists/list-item/list-item';
import { configurationChoices } from '../../state/configuration-choices';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';
import { ComposerPopover } from '../composer-popover/composer-popover';

type Option = SessionConfigOption;
type Change = ComposerConfigurationProps['onConfigChange'];
const maximumHeight = 320;
const rowEstimate = 52;
const sectionGap = 16;
const screenFraction = 0.6;

function optionsFor(configuration: ComposerConfigurationProps): Option[] {
  return configuration.configOptions.filter(
    (option) =>
      option.type === 'boolean' ||
      !['mode', 'model', 'thought_level'].includes(option.category ?? ''),
  );
}

function BooleanSetting({
  option,
  onChange,
}: {
  option: Extract<Option, { type: 'boolean' }>;
  onChange: Change;
}): React.JSX.Element {
  const change = (): void => onChange(option.configId, !option.currentValue);
  const native = Platform.OS !== 'web';
  const toggle = (
    <Switch
      accessibilityLabel={option.name}
      checked={option.currentValue}
      onCheckedChange={(checked) => onChange(option.configId, checked)}
    />
  );
  return (
    <ListItem
      title={option.name}
      role={native ? undefined : 'switch'}
      checked={native ? undefined : option.currentValue}
      disclosure={false}
      onPress={native ? undefined : change}
      control={native ? toggle : undefined}
      accessory={
        native ? undefined : (
          <View
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
          >
            {toggle}
          </View>
        )
      }
    />
  );
}

function SettingSection({
  option,
  onChange,
}: {
  option: Option;
  onChange: Change;
}): React.JSX.Element {
  if (option.type === 'boolean')
    return (
      <FieldSection>
        <BooleanSetting option={option} onChange={onChange} />
      </FieldSection>
    );
  return (
    <FieldSection title={option.name}>
      {configurationChoices(option).map((choice) => (
        <ListItem
          key={choice.value}
          title={choice.name}
          accessibilityLabel={`${option.name}: ${choice.name}`}
          role="button"
          disclosure={false}
          selected={option.currentValue === choice.value}
          onPress={() => onChange(option.configId, choice.value)}
          accessory={
            option.currentValue === choice.value ? <SelectedCheck /> : undefined
          }
        />
      ))}
    </FieldSection>
  );
}

function OptionsContents({
  options,
  onChange,
}: {
  options: Option[];
  onChange: Change;
}): React.JSX.Element {
  const { height } = useWindowDimensions();
  if (Platform.OS !== 'web')
    return (
      <View className="flex-1 bg-sidebar">
        <FieldGroup>
          {options.map((option) => (
            <SettingSection
              key={option.configId}
              option={option}
              onChange={onChange}
            />
          ))}
        </FieldGroup>
      </View>
    );
  const rows = options.reduce(
    (count, option) =>
      count +
      (option.type === 'boolean' ? 1 : configurationChoices(option).length + 1),
    0,
  );
  return (
    <View className="wide:p-3 bg-sidebar">
      <View
        style={{
          height: Math.min(
            rows * rowEstimate + options.length * sectionGap,
            maximumHeight,
            height * screenFraction,
          ),
        }}
      >
        <LegendList
          {...listTestIdProps('composer-settings-scroll')}
          style={{ flex: 1 }}
          data={options}
          keyExtractor={(option) => option.configId}
          renderItem={({ item }) => (
            <SettingSection option={item} onChange={onChange} />
          )}
          estimatedItemSize={120}
          recycleItems={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={{ gap: 16 }}
        />
      </View>
    </View>
  );
}

export function ComposerOptions({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}): React.JSX.Element | null {
  const options = optionsFor(configuration);
  if (!options.length) return null;
  return (
    <ComposerPopover
      listContent
      label="Session settings"
      trigger={
        <Button
          appearance="content"
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Session settings"
          label="Settings"
          className="h-7 sm:h-7 px-1.5 py-0"
          labelClassName="text-muted-foreground"
        />
      }
    >
      {() => (
        <OptionsContents
          options={options}
          onChange={configuration.onConfigChange}
        />
      )}
    </ComposerPopover>
  );
}
