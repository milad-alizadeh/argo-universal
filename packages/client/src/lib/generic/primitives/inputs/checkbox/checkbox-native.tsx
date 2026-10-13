import type { ComponentType } from 'react';
import { View } from 'react-native';
import { Host } from '../../native/host';
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
    <View className="gap-2">
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
