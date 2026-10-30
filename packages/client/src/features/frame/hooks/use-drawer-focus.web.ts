import { type RefObject, useEffect, useLayoutEffect } from 'react';

const isTabStop = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement &&
  element.tabIndex >= 0 &&
  !element.matches(':disabled');

const tabStops = (drawer: HTMLElement): HTMLElement[] =>
  [...drawer.querySelectorAll('*')].filter(isTabStop);

// The row a Tab press lands on: the next one in the direction of travel, wrapping at either end. From outside the drawer it is the row at the end Tab enters by.
function tabTarget(
  stops: readonly HTMLElement[],
  active: Element | null,
  step: 1 | -1,
): HTMLElement | undefined {
  const at = stops.findIndex((stop) => stop === active);
  const from = at < 0 && step < 0 ? 0 : at;

  return stops.at((from + step) % stops.length);
}

const stepOf = (event: KeyboardEvent): 1 | -1 => (event.shiftKey ? -1 : 1);

function trapTab(drawer: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  event.preventDefault();
  tabTarget(tabStops(drawer), document.activeElement, stepOf(event))?.focus();
}

function returnFocus(opener: Element | null): void {
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

// Focus enters the drawer and Tab stays in it until the cleanup, which hands focus back to whatever held it.
function holdFocus(drawer: HTMLElement): () => void {
  const opener = document.activeElement;
  const onKeyDown = (event: KeyboardEvent): void => trapTab(drawer, event);

  tabStops(drawer)[0]?.focus();
  document.addEventListener('keydown', onKeyDown);

  return (): void => {
    document.removeEventListener('keydown', onKeyDown);
    returnFocus(opener);
  };
}

function useInert(ref: RefObject<HTMLElement | null>, inert: boolean): void {
  useLayoutEffect(() => {
    if (ref.current) ref.current.inert = inert;
  }, [ref, inert]);
}

// An open drawer sits in front of the page: focus moves into it and stays while it is open, then returns to the control that opened it.
export function useDrawerFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useInert(ref, !open);

  useEffect(() => {
    const drawer = open ? ref.current : null;

    return drawer ? holdFocus(drawer) : undefined;
  }, [ref, open]);
}
