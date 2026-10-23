import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  controlSize,
  type ModifierConfig,
  onTapGesture,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps, ComponentType } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#kit/utils';
import { Host } from '#primitives/native/host';
import { CheckboxAccessibility } from './checkbox-accessibility';
import { AppleRadioRow, type CheckboxRowProps } from './checkbox-apple-row';
import { CheckboxBox } from './checkbox-box';
import { CheckboxMark } from './checkbox-mark';
import { MaterialRadioRow } from './checkbox-material-row';
import type { CheckboxIndicatorProps, CheckboxProps } from './checkbox-props';
import { checkboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const RadioRow = Platform.OS === 'ios' ? AppleRadioRow : MaterialRadioRow;

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  const state = checkboxState(props);

  return (
    <CheckboxAccessibility {...props}>
      <CheckboxControl {...props} state={state} />
    </CheckboxAccessibility>
  );
}

function CheckboxControl(props: CheckboxRowProps): React.JSX.Element {
  if (props.selection === 'single') return <RadioControl {...props} />;

  return (
    <Host {...hostSize(props.variant === 'inline')}>
      <CheckboxBox
        label={props.label}
        value={props.value}
        disabled={props.disabled}
        inline={props.variant === 'inline'}
        onValueChange={props.state.toggle}
        modifiers={checkboxModifiers(props)}
      />
    </Host>
  );
}

// A row fills its width; inline sizes to its label beside other content.
function hostSize(inline: boolean): ComponentProps<typeof Host> {
  return inline
    ? { matchContents: true }
    : { matchContents: { vertical: true }, style: { width: '100%' } };
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
    'overflow-hidden rounded-lg android:rounded-xl',
    props.value && 'bg-selected',
  );
}

// SwiftUI's stock Toggle needs a label tap action, and inline is its compact button style; Android's separate mark needs the field name.
function checkboxModifiers(
  props: CheckboxRowProps,
): ComponentProps<typeof CheckboxBox>['modifiers'] {
  if (Platform.OS === 'android')
    return [semantics({ contentDescription: props.label })];

  return appleStyle(props);
}

function appleStyle(props: CheckboxRowProps): ModifierConfig[] {
  return props.variant === 'inline'
    ? [toggleStyle('button'), controlSize('small')]
    : [onTapGesture(props.state.toggle)];
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
