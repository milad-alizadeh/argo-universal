import { type RefObject, useEffect } from 'react';
import type { View } from 'react-native';

export function usePlanProposalKeyboard(
  card: RefObject<View | null>,
  submit: () => void,
  back: () => void,
) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const element = card.current as unknown as HTMLElement | null;
      const focused = document.activeElement;
      if (!element || (focused !== document.body && !element.contains(focused)))
        return;
      if (
        event.isComposing ||
        event.shiftKey ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (event.key === 'Escape') {
        event.preventDefault();
        back();
      } else if (
        event.key === 'Enter' &&
        !(focused instanceof HTMLButtonElement) &&
        !(focused instanceof HTMLAnchorElement)
      ) {
        event.preventDefault();
        submit();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [card, submit, back]);
}
