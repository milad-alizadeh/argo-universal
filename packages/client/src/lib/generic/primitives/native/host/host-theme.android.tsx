import { requireNativeView } from 'expo';
import type { HostThemeProps } from './host-theme-props';

const NativeHostTheme = requireNativeView<HostThemeProps>(
  'ClientTheme',
  'HostTheme',
);

// Expo's seeded Tonal Spot palette adds chroma even to Argo's neutral accent.
export function HostTheme(props: HostThemeProps): React.JSX.Element {
  return <NativeHostTheme {...props} />;
}
