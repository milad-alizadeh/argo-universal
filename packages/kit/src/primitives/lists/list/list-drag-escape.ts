import { useEffect } from 'react';

// Escape puts a dragged row back, as a desktop drag does.
export function useDragEscape(cancel: () => void, dragging: boolean): void {
  useEffect(() => {
    if (!dragging) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      cancel();
    };

    window.addEventListener('keydown', onKeyDown, true);

    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [cancel, dragging]);
}
