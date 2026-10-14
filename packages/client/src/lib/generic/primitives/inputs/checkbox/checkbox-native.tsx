import type { ComponentType } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Host } from '#primitives/native/host';
import type { CheckboxProps } from './checkbox-props';
import {
  CheckboxFooter,
  type CheckboxState,
  useCheckboxState,
} from './checkbox-state';

type NativeProps = CheckboxProps & {
  Control: ComponentType<CheckboxProps & { state: CheckboxState }>;
};

export function NativeCheckbox({
  Control,
  ...props
}: NativeProps): React.JSX.Element {
  const state = useCheckboxState(props);

  return (
    <View className={nativeContainerClass(props)}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <Control {...props} state={state} />
      </Host>
      <CheckboxFooter {...state} />
    </View>
  );
}

export function createNativeCheckbox(
  Control: NativeProps['Control'],
): ComponentType<CheckboxProps> {
  return function Checkbox(props: CheckboxProps): React.JSX.Element {
    return <NativeCheckbox {...props} Control={Control} />;
  };
}

function nativeContainerClass(props: CheckboxProps): string {
  return cn(
    'gap-2',
    props.variant === 'option' && optionContainerClass(props),
  );
}

function optionContainerClass(props: CheckboxProps): string {
  return cn(
    'overflow-hidden rounded-lg android:rounded-[12px]',
    props.value && 'bg-foreground/4',
  );
}
