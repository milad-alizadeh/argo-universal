import type { ObservableState } from '@expo/ui';
import { useEffect } from 'react';

// The native field's text follows the form's value when the form changes it, such as on reset.
export function useFollowedText(
  text: ObservableState<string>,
  value: string,
): void {
  useEffect(() => {
    if (text.get() !== value) text.set(value);
  }, [text, value]);
}
