import type { KeyboardEvent } from 'react';

function destination(
  key: string,
  index: number,
  count: number,
): number | undefined {
  return new Map([
    ['ArrowRight', (index + 1) % count],
    ['ArrowDown', (index + 1) % count],
    ['ArrowLeft', (index + count - 1) % count],
    ['ArrowUp', (index + count - 1) % count],
    ['Home', 0],
    ['End', count - 1],
  ]).get(key);
}

// Navigate only this track's enabled choices, wrapping at either end.
export function moveSegment(event: KeyboardEvent<HTMLButtonElement>): void {
  const segments = enabledSegments(event.currentTarget);

  const next = destination(
    event.key,
    segments.indexOf(event.currentTarget),
    segments.length,
  );

  if (next === undefined) return;

  event.preventDefault();
  choose(segments[next]);
}

function enabledSegments(button: HTMLButtonElement): HTMLButtonElement[] {
  const group = button.closest('[role="group"]');

  return [
    ...(group?.querySelectorAll<HTMLButtonElement>('button:enabled') ?? []),
  ];
}

function choose(segment: HTMLButtonElement | undefined): void {
  segment?.focus();
  segment?.click();
}
