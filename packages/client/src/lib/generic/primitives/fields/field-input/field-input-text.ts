import type { useNativeState } from '@expo/ui/swift-ui';
import { useEffect } from 'react';

// The native field's text follows the form's value when the form changes it, such as on reset.
export function useFollowedText(
  text: ReturnType<typeof useNativeState<string>>,
  value: string,
): void {
  useEffect(() => {
    if (text.get() !== value) text.set(value);
  }, [text, value]);
}
