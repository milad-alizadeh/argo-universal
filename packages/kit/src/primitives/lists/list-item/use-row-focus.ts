import { useState } from 'react';
import { Platform } from 'react-native';

/*
 * Capture how focus arrived. Chromium can turn :focus-visible on later when
 * Shift alone is pressed, even though the row was focused with the pointer.
 */
interface RowFocus {
  onFocus?: (event: { currentTarget: unknown }) => void;
  onBlur?: () => void;
  className?: string;
}

export function useRowFocus(): RowFocus {
  const [visible, setVisible] = useState(false);

  if (Platform.OS !== 'web') return {};

  return {
    onFocus: (event: { currentTarget: unknown }): void => {
      if (event.currentTarget instanceof HTMLElement)
        setVisible(event.currentTarget.matches(':focus-visible'));
    },
    onBlur: (): void => setVisible(false),
    className: visible
      ? 'outline-2 outline-focus -outline-offset-2'
      : 'outline-none',
  };
}
