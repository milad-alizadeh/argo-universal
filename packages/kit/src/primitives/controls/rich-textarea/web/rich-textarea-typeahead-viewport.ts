import { useEffect, type RefObject } from 'react';

const viewportInset = 8;

const menuMaxHeight = 350;

function viewportTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

function fitMenu(menu: HTMLDivElement | null): void {
  if (!menu?.isConnected) return;
  const top = viewportTop();
  const available = menu.getBoundingClientRect().bottom - top - viewportInset;
  menu.style.maxHeight = `${Math.max(0, Math.min(menuMaxHeight, available))}px`;
  revealSelection(menu);
}

function selectionOffset(menu: DOMRect, selected: DOMRect): number {
  const top = menu.top + viewportInset;
  const bottom = menu.bottom - viewportInset;

  if (selected.top < top) return selected.top - top;

  return Math.max(0, selected.bottom - bottom);
}

function revealSelection(menu: HTMLDivElement): void {
  const selected = menu.querySelector('[aria-selected="true"]');

  if (!selected) return;
  menu.scrollTop += selectionOffset(
    menu.getBoundingClientRect(),
    selected.getBoundingClientRect(),
  );
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

export function useTypeaheadViewport(
  anchor: HTMLElement,
  menu: RefObject<HTMLDivElement | null>,
  selectedIndex: number | null,
): void {
  useEffect(() => fitMenu(menu.current), [menu, selectedIndex]);
  useEffect(
    () => observeViewport(anchor, () => fitMenu(menu.current)),
    [anchor, menu],
  );
}
