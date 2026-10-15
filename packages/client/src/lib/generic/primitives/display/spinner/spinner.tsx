import type { ReactElement } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import type { SpinnerProps, SpinnerTone } from './spinner-props';

const webSpinnerSize = 16;

const toneColor = {
  muted: 'accent-muted-foreground',
  accent: 'accent-accent',
  danger: 'accent-danger',
} as const satisfies Record<SpinnerTone, string>;

export function Spinner({
  accessibilityLabel,
  tone = 'muted',
}: SpinnerProps): ReactElement {
  return (
    <ActivityIndicator
      role="progressbar"
      accessibilityLabel={accessibilityLabel}
      colorClassName={toneColor[tone]}
      size={Platform.OS === 'web' ? webSpinnerSize : 'small'}
    />
  );
}
