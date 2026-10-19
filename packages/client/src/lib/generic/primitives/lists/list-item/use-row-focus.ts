import { useState } from 'react';
import { Platform } from 'react-native';

// Capture how focus arrived. Chromium can turn :focus-visible on later when
// Shift alone is pressed, even though the row was focused with the pointer.
export function useRowFocus() {
  const [visible, setVisible] = useState(false);

  if (Platform.OS !== 'web') return {};

  return {
    onFocus: (event: { currentTarget: unknown }) => {
      const target = event.currentTarget as HTMLElement;
      setVisible(target.matches(':focus-visible'));
    },
    onBlur: () => setVisible(false),
    className: visible
      ? 'outline-2 outline-focus -outline-offset-2'
      : 'outline-none',
  };
}
