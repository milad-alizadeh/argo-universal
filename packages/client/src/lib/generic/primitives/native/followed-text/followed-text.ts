import type { ObservableState } from '@expo/ui';
import { useEffect, useRef } from 'react';

type NativeText = Pick<ObservableState<string>, 'get' | 'set'>;

// Native edits already changed the field. Only an external value is written back across the bridge.
export function useFollowedText(
  text: NativeText,
  value: string,
  onChangeText: (value: string) => void,
): (value: string) => void {
  const pending = useRef<string[]>([]);
  useEffect(() => {
    if (!takeEcho(pending.current, value) && text.get() !== value)
      text.set(value);
  }, [text, value]);

  return (next) => {
    pending.current.push(next);
    onChangeText(next);
  };
}

// React can commit an earlier edit after native text has advanced, or batch several edits into one commit.
function takeEcho(pending: string[], value: string): boolean {
  const index = pending.lastIndexOf(value);

  if (index < 0) {
    pending.length = 0;

    return false;
  }

  pending.splice(0, index + 1);

  return true;
}
