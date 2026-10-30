import { useLayoutEffect, useState, type RefObject } from 'react';

const viewportInset = 8;

const menuMaxHeight = 350;

function viewportTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

// The menu's rows grow up from the field: as tall as the room above it, to 350 at most.
function fitMenu(menu: HTMLDivElement | null): number | undefined {
  if (!menu?.isConnected) return undefined;

  const available =
    menu.getBoundingClientRect().bottom - viewportTop() - viewportInset;

  return Math.max(0, Math.min(menuMaxHeight, available));
}

function observeViewport(anchor: HTMLElement, update: () => void): () => void {
  const observer = new MutationObserver(update);
  observer.observe(anchor, { attributes: true, attributeFilter: ['style'] });
  window.addEventListener('resize', update);
  window.addEventListener('scroll', update, true);
  window.visualViewport?.addEventListener('resize', update);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', update);
    window.removeEventListener('scroll', update, true);
    window.visualViewport?.removeEventListener('resize', update);
  };
}

/*
 * How tall the menu's rows may grow, kept up to date as the window and the field move. It measures before the
 * first paint, so a window with less room than 350 above the field never draws the menu past its top.
 */
export function useMenuMaxHeight(
  anchor: HTMLElement,
  menu: RefObject<HTMLDivElement | null>,
): number {
  const [maxHeight, setMaxHeight] = useState(menuMaxHeight);
  useLayoutEffect(() => {
    const update = (): void => {
      const fitted = fitMenu(menu.current);

      if (fitted !== undefined) setMaxHeight(fitted);
    };

    update();

    return observeViewport(anchor, update);
  }, [anchor, menu]);

  return maxHeight;
}
