import { useEffect } from 'react';

/*
 * Escape puts a dragged row back, as a desktop drag does. It listens on the window itself: Escape is reserved, so no
 * Action can declare it, and it must reach the drag wherever focus sits, ahead of the focused row's own handlers.
 */
export function useDragEscape(cancel: () => void, dragging: boolean): void {
  useEffect(() => {
    if (!dragging) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      cancel();
    };

    window.addEventListener('keydown', onKeyDown, true);

    return (): void => window.removeEventListener('keydown', onKeyDown, true);
  }, [cancel, dragging]);
}
