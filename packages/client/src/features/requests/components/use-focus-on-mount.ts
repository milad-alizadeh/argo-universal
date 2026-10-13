import { useEffect, useRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';

// Moves focus to the field once it mounts, in place of autoFocus.
export function useFocusOnMount(): RefObject<TextInput | null> {
  const field = useRef<TextInput>(null);
  useEffect(() => {
    field.current?.focus();
  }, []);

  return field;
}
