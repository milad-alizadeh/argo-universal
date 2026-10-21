import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { FormSurfaceProps } from './form-surface-props';

// While the Form submits its fields take no touches and read as busy.
export function FormFields(props: FormSurfaceProps): ReactElement {
  return (
    <View
      pointerEvents={props.locked ? 'none' : 'auto'}
      aria-busy={props.locked}
      className={props.locked ? 'gap-6 opacity-50' : 'gap-6'}
    >
      {props.children}
    </View>
  );
}
