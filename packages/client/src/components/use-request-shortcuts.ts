import { useEffect, useId } from 'react';
import { Platform } from 'react-native';
import { useWide } from '../navigation/use-wide';

export function useRequestShortcuts({
  inactive,
  onEnter,
  onEscape,
}: {
  inactive: boolean;
  onEnter: () => void;
  onEscape?: () => void;
}) {
  const nativeId = `request-card-${useId()}`;
  const wide = useWide();
  useEffect(() => {
    if (Platform.OS !== 'web' || !wide || inactive) return;
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      const card = document.getElementById(nativeId);
      const focused = document.activeElement;
      if (
        !card?.contains(focused) &&
        (focused !== document.body ||
          document.querySelectorAll('[id^="request-card-"]').length !== 1)
      )
        return;
      if (
        focused?.closest(
          '[role="combobox"], [role="listbox"], [role="menu"], [aria-expanded]',
        )
      )
        return;
      const action = event.key === 'Escape' ? onEscape : undefined;
      if (event.key === 'Enter' && !focused?.closest('[role="button"]')) {
        event.preventDefault();
        event.stopPropagation();
        onEnter();
      } else if (action) {
        event.preventDefault();
        event.stopPropagation();
        action();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [nativeId, wide, inactive, onEnter, onEscape]);
  return nativeId;
}
