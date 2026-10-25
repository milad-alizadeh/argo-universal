import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

function follow(set: (on: boolean) => void): () => void {
  let live = true;

  void AccessibilityInfo.isScreenReaderEnabled().then((on) => live && set(on));

  const sub = AccessibilityInfo.addEventListener('screenReaderChanged', set);

  return (): void => {
    live = false;
    sub.remove();
  };
}

// Native: true while VoiceOver or TalkBack is on; the Chart mounts its data table only then.
export function useTableMounted(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => follow(setOn), []);

  return on;
}
