import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

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

const noop = (): void => {};

function focusTaken(element: HTMLElement): boolean {
  element.focus();

  return document.activeElement === element;
}

const named = (label: string | null): HTMLElement[] =>
  label
    ? [
        ...document.querySelectorAll<HTMLElement>(
          `[aria-label="${CSS.escape(label)}"]`,
        ),
      ]
    : [];

// The controls that can stand for the opener: itself while it is still the page's, else the controls of the same name. A row picked in the drawer navigates, and the page that held the opener gives way to the next, which draws its own.
const openerCandidates = (opener: HTMLElement): HTMLElement[] => [
  opener,
  ...named(opener.getAttribute('aria-label')),
];

const refocusOpener = (opener: HTMLElement): boolean =>
  openerCandidates(opener).some(focusTaken);

function observePage(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'inert', 'aria-hidden'],
  });

  return (): void => observer.disconnect();
}

const personInputs = ['keydown', 'pointerdown', 'focusin'] as const;

function untilInput(onInput: () => void): () => void {
  for (const input of personInputs)
    document.addEventListener(input, onInput, true);

  return (): void => {
    for (const input of personInputs)
      document.removeEventListener(input, onInput, true);
  };
}

// A page that is opening may not have drawn its opener yet, so the wait follows the page's own changes and ends at the first input of the person's: focus is theirs again from then on. Returns what ends the wait.
function awaitOpener(opener: HTMLElement): () => void {
  const ends: (() => void)[] = [];

  const stop = (): void => {
    for (const end of ends) end();
  };

  ends.push(
    observePage(() => {
      if (refocusOpener(opener)) stop();
    }),
    untilInput(stop),
  );

  return stop;
}

function returnFocus(opener: Element | null): () => void {
  if (!(opener instanceof HTMLElement) || refocusOpener(opener)) return noop;

  return awaitOpener(opener);
}

// Focus enters the drawer and Tab stays in it until the cleanup, which hands focus back to whatever held it and returns what ends any wait for the opener to appear.
function holdFocus(drawer: HTMLElement): () => () => void {
  const opener = document.activeElement;
  const onKeyDown = (event: KeyboardEvent): void => trapTab(drawer, event);

  tabStops(drawer)[0]?.focus();
  document.addEventListener('keydown', onKeyDown);

  return (): (() => void) => {
    document.removeEventListener('keydown', onKeyDown);

    return returnFocus(opener);
  };
}

// The scrim belongs to the navigator, not to the drawer's content, so it is found by the name the navigator gave it, from the drawer's own ancestors.
function findScrim(drawer: HTMLElement, label: string): HTMLElement | null {
  const selector = `[role="button"][aria-label="${CSS.escape(label)}"]`;

  for (let up = drawer.parentElement; up; up = up.parentElement) {
    const found = up.querySelector<HTMLElement>(selector);

    if (found) return found.parentElement;
  }

  return null;
}

function setInert(element: HTMLElement | null, inert: boolean): void {
  if (element) element.inert = inert;
}

// The drawer and its scrim leave the Tab order together while it is closed.
function useInert(
  ref: RefObject<HTMLElement | null>,
  scrimLabel: string,
  inert: boolean,
): void {
  useLayoutEffect(() => {
    const drawer = ref.current;
    const scrim = drawer && findScrim(drawer, scrimLabel);

    setInert(drawer, inert);
    setInert(scrim, inert);

    return (): void => setInert(scrim, false);
  }, [ref, scrimLabel, inert]);
}

interface Waiting {
  current: () => void;
}

function holdThenWait(drawer: HTMLElement, waiting: Waiting): () => void {
  waiting.current();
  const release = holdFocus(drawer);

  return (): void => {
    waiting.current = release();
  };
}

function useHeldFocus(ref: RefObject<HTMLElement | null>, open: boolean): void {
  const waiting = useRef<() => void>(noop);

  useEffect(() => {
    const drawer = open ? ref.current : null;

    return drawer ? holdThenWait(drawer, waiting) : noop;
  }, [ref, open]);

  useEffect(() => (): void => waiting.current(), []);
}

// An open drawer sits in front of the page: focus moves into it and stays while it is open, then returns to the control that opened it. `scrimLabel` is the name the navigator gave the backdrop that closes it.
export function useDrawerFocus(
  ref: RefObject<HTMLElement | null>,
  scrimLabel: string,
  open: boolean,
): void {
  useInert(ref, scrimLabel, !open);
  useHeldFocus(ref, open);
}
