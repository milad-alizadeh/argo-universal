import { Checkbox as UniversalCheckbox } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityHint, onTapGesture } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps, ComponentType } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Host } from '#primitives/native/host';
import { CheckboxAccessibility } from './checkbox-accessibility';
import { AppleRadioRow, type CheckboxRowProps } from './checkbox-apple-row';
import { CheckboxMark } from './checkbox-mark';
import { MaterialRadioRow } from './checkbox-material-row';
import type { CheckboxIndicatorProps, CheckboxProps } from './checkbox-props';
import { CheckboxFooter, useCheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const RadioRow = Platform.OS === 'ios' ? AppleRadioRow : MaterialRadioRow;

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  const state = useCheckboxState(props);

  return (
    <View className="gap-2">
      <CheckboxAccessibility {...props} description={state.description}>
        <CheckboxControl {...props} state={state} />
      </CheckboxAccessibility>
      <CheckboxFooter {...state} />
    </View>
  );
}

function CheckboxControl(props: CheckboxRowProps): React.JSX.Element {
  if (props.selection === 'single') return <RadioControl {...props} />;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <UniversalCheckbox
        label={props.label}
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.state.toggle}
        modifiers={checkboxModifiers(props)}
      />
    </Host>
  );
}

function RadioControl(props: CheckboxRowProps): React.JSX.Element {
  return (
    <View className={surfaceClass(props)}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <RadioRow {...props} />
      </Host>
    </View>
  );
}

// React Native draws the row's fill from tokens, since native rows take no colour but the Host's.
function surfaceClass(props: CheckboxProps): string {
  if (props.variant !== 'option')
    return 'android:overflow-hidden android:rounded-lg android:bg-muted';

  return cn(
    'overflow-hidden rounded-lg android:rounded-selection',
    props.value && 'bg-selected',
  );
}

// SwiftUI's stock Toggle needs a label tap action; Android's separate mark needs the field name.
function checkboxModifiers(
  props: CheckboxRowProps,
): ComponentProps<typeof UniversalCheckbox>['modifiers'] {
  const description = props.state.description;
  const name = [props.label, description].filter(Boolean).join('. ');

  if (Platform.OS === 'android')
    return [semantics({ contentDescription: name })];

  return [
    onTapGesture(props.state.toggle),
    accessibilityHint(description ?? ''),
  ];
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): React.JSX.Element {
  return (
    <View
      className="pointer-events-none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Host matchContents>
        <CheckboxMark {...props} />
      </Host>
    </View>
  );
}

Checkbox satisfies ComponentType<CheckboxProps>;

CheckboxIndicator satisfies ComponentType<CheckboxIndicatorProps>;
