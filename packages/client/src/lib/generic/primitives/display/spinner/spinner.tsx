import type { ReactElement } from 'react';
import { ActivityIndicator, Platform } from 'react-native';

export interface SpinnerProps {
  label: string;
}

const webSpinnerSize = 16;

export function Spinner({ label }: SpinnerProps): ReactElement {
  return (
    <ActivityIndicator
      role="progressbar"
      accessibilityLabel={label}
      colorClassName="accent-muted-foreground"
      size={Platform.OS === 'web' ? webSpinnerSize : 'small'}
    />
  );
}
