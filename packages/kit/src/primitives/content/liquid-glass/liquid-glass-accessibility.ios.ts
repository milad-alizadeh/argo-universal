import { AccessibilityInfo } from 'react-native';

export const readReducedTransparency = (): Promise<boolean> =>
  AccessibilityInfo.isReduceTransparencyEnabled();

export function subscribeReducedTransparency(
  onChange: (reduced: boolean) => void,
): () => void {
  const subscription = AccessibilityInfo.addEventListener(
    'reduceTransparencyChanged',
    onChange,
  );

  return () => subscription.remove();
}
