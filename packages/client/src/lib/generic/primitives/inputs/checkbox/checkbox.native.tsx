import type { ComponentType } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Host } from '#primitives/native/host';
import { AppleCheckboxRow, CheckMark } from './checkbox-apple-row';
import { MaterialCheckboxRow, MaterialMark } from './checkbox-material-row';
import type { CheckboxIndicatorProps, CheckboxProps } from './checkbox-props';
import { CheckboxFooter, useCheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const CheckboxRow =
  Platform.OS === 'ios' ? AppleCheckboxRow : MaterialCheckboxRow;

export function Checkbox(props: CheckboxProps): React.JSX.Element {
  const state = useCheckboxState(props);

  return (
    <View className="gap-2">
      <View className={surfaceClass(props)}>
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <CheckboxRow {...props} state={state} />
        </Host>
      </View>
      <CheckboxFooter {...state} />
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
