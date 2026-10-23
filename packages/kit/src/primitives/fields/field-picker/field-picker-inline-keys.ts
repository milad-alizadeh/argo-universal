import type { KeyDownEvent } from 'react-native';

// The arrows step to the next or previous radio of the group, wrapping at the ends; Home and End go to either end.
function destination(
  key: string,
  index: number,
  count: number,
): number | undefined {
  const destinations = new Map([
    ['ArrowDown', (index + 1) % count],
    ['ArrowRight', (index + 1) % count],
    ['ArrowUp', (index + count - 1) % count],
    ['ArrowLeft', (index + count - 1) % count],
    ['Home', 0],
    ['End', count - 1],
  ]);

  return destinations.get(key);
}

/*
 * The radios of the group a radio belongs to. A Section frames each option as a row of its own, so the group has no
 * element of its own: it is the nearest ancestor holding more than one radio.
 */
function groupOf(radio: HTMLElement): HTMLElement[] {
  for (let at = radio.parentElement; at; at = at.parentElement) {
    const radios = [...at.querySelectorAll<HTMLElement>('[role="radio"]')];

    if (radios.length > 1) return radios;
  }

  return [];
}

// The radio the key reaches, if it is one this group moves to.
function reached(
  radios: HTMLElement[],
  key: string,
  current: HTMLElement,
): HTMLElement | undefined {
  const next = destination(key, radios.indexOf(current), radios.length);

  return next === undefined ? undefined : radios[next];
}

/*
 * A radio group takes one tab stop and the arrow keys move through it, choosing as they go (WAI-ARIA's radio group).
 * The web draws a radio as a DOM element; native rows use their platform's focus navigation.
 */
export function moveThroughRadios(event: KeyDownEvent): void {
  const current = event.currentTarget;

  if (!(current instanceof HTMLElement)) return;

  const target = reached(groupOf(current), event.nativeEvent.key, current);

  if (!target) return;

  event.preventDefault();
  target.focus();
  target.click();
}
