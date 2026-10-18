import type { ReactElement } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import type { SpinnerProps } from './spinner-props';

const webSpinnerSize = 16;

export function Spinner({ accessibilityLabel }: SpinnerProps): ReactElement {
  return (
    <ActivityIndicator
      role="progressbar"
      accessibilityLabel={accessibilityLabel}
      colorClassName="accent-muted-foreground"
      size={Platform.OS === 'web' ? webSpinnerSize : 'small'}
    />
  );
}
