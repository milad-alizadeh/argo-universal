import { Checkbox as StockCheckbox } from '@expo/ui';
import type { ComponentType } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Host } from '#primitives/native/host';
import {
  AppleCheckboxRow,
  CheckMark,
  stockCheckboxSemantics as appleSemantics,
} from './checkbox-apple-row';
import {
  MaterialCheckboxRow,
  MaterialMark,
  stockCheckboxSemantics as materialSemantics,
} from './checkbox-material-row';
import type {
  CheckboxIndicatorProps,
  CheckboxProps,
  CheckboxRowProps,
} from './checkbox-props';
import { CheckboxFooter, useCheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const isIos = Platform.OS === 'ios';

const CheckboxRow = isIos ? AppleCheckboxRow : MaterialCheckboxRow;

const stockSemantics = isIos ? appleSemantics : materialSemantics;

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  const state = useCheckboxState(props);

  return (
    <View className="gap-2">
      {props.selection === 'single' ? (
        <SingleChoiceRow {...props} state={state} />
      ) : (
        <StockRow {...props} state={state} />
      )}
      <CheckboxFooter {...state} />
    </View>
  );
}

// Single choice keeps Argo's row; the stock Checkbox has no radio semantics.
function SingleChoiceRow(props: CheckboxRowProps): React.JSX.Element {
  return (
    <View className={surfaceClass(props)}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <CheckboxRow {...props} />
      </Host>
    </View>
  );
}

// Expo draws the label, mark, sizing and disabled state.
function StockRow(props: CheckboxRowProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <StockCheckbox
        label={props.label}
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.state.toggle}
        modifiers={stockSemantics(props)}
      />
    </Host>
  );
}

// React Native draws the row's fill from tokens, since native rows take no colour but the Host's.
function surfaceClass(props: CheckboxProps): string {
  if (props.variant !== 'option')
    return 'android:overflow-hidden android:rounded-lg android:bg-muted';

  return cn(
    'overflow-hidden rounded-lg android:rounded-selection',
    props.value && 'bg-foreground/4',
  );
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): React.JSX.Element | null {
  if (Platform.OS !== 'ios')
    return (
      <Host matchContents>
        <MaterialMark {...props} />
      </Host>
    );

  return props.value ? (
    <Host matchContents>
      <CheckMark />
    </Host>
  ) : null;
}

Checkbox satisfies ComponentType<CheckboxProps>;

CheckboxIndicator satisfies ComponentType<CheckboxIndicatorProps>;
