import { type ObservableState, useNativeState } from '@expo/ui';
import { useEffect } from 'react';

// Expo UI's TextInput holds its text in native state; a value the caller changes, such as a saved one, is written back.
export function useFieldText(value: string): ObservableState<string> {
  const text = useNativeState(value);

  useEffect(() => {
    if (text.get() !== value) text.set(value);
  }, [text, value]);

  return text;
}
