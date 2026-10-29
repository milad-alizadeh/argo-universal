import { useEffect, type RefObject } from 'react';

const viewportInset = 8;

function viewportTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

function fitMenu(menu: HTMLDivElement | null): void {
  if (!menu?.isConnected) return;
  const top = viewportTop();
  const available = menu.getBoundingClientRect().bottom - top - viewportInset;
  menu.style.maxHeight = `${Math.max(0, available)}px`;
}

function observeViewport(anchor: HTMLElement, update: () => void): () => void {
  const observer = new MutationObserver(update);
  observer.observe(anchor, { attributes: true, attributeFilter: ['style'] });
  window.addEventListener('resize', update);
  window.addEventListener('scroll', update, true);
  window.visualViewport?.addEventListener('resize', update);
  const frame = requestAnimationFrame(update);

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', update);
    window.removeEventListener('scroll', update, true);
    window.visualViewport?.removeEventListener('resize', update);
  };
}

export function useSuggestionViewport(
  anchor: HTMLElement,
  menu: RefObject<HTMLDivElement | null>,
): void {
  useEffect(
    () => observeViewport(anchor, () => fitMenu(menu.current)),
    [anchor, menu],
  );
}
