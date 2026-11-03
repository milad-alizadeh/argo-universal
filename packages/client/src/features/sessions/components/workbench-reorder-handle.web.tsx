import { Icon } from '@repo/kit/primitives/content/icon';
import { cn } from '@repo/kit/utils';
import {
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import type { ColumnRef } from './use-workbench-reorder';
import type { CardSlot, Grab } from './workbench-reorder-model';

export interface ReorderHandleProps {
  label: string;
  column: ColumnRef;
  // The pointer is over this handle's card, or the card is being held.
  shown: boolean;
  onGrab: (grab: Grab) => void;
  onMove: (pointerY: number) => void;
  onRelease: () => void;
  onCancel: () => void;
  onNudge: (by: -1 | 1) => void;
}

type HandleEvent = PointerEvent<HTMLDivElement>;

const nudges = new Map<string, -1 | 1>([
  ['ArrowUp', -1],
  ['ArrowDown', 1],
]);

// Every card's place in the page, read as the handle is taken.
function measureSlots({ current }: ColumnRef): CardSlot[] {
  const slots = current instanceof HTMLElement ? [...current.children] : [];

  return slots.map((slot) => {
    const { top, height } = slot.getBoundingClientRect();

    return { top, height };
  });
}

function grab(props: ReorderHandleProps, event: HandleEvent): void {
  event.currentTarget.setPointerCapture(event.pointerId);
  event.preventDefault();
  props.onGrab({
    pointerY: event.clientY,
    slots: measureSlots(props.column),
  });
}

function release(props: ReorderHandleProps, event: HandleEvent): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);

  props.onRelease();
}

function nudge(
  props: ReorderHandleProps,
  event: KeyboardEvent<HTMLDivElement>,
): void {
  const by = nudges.get(event.key);

  if (by === undefined) return;
  event.preventDefault();
  props.onNudge(by);
}

const pointerHandlers = (
  props: ReorderHandleProps,
): HTMLAttributes<HTMLDivElement> => ({
  onPointerDown: (event) => grab(props, event),
  onPointerMove: (event) => props.onMove(event.clientY),
  onPointerUp: (event) => release(props, event),
  onPointerCancel: props.onCancel,
  onKeyDown: (event) => nudge(props, event),
});

const handleClass =
  'flex h-6 w-8 cursor-grab touch-none select-none items-center justify-center rounded-control outline-none transition-opacity duration-150 hover:bg-hover focus-visible:bg-hover active:cursor-grabbing';

/*
 * The handle's class and focus handlers: it shows while its card says so or while it has focus. Only the keyboard
 * focuses it: a pointer press is taken by the drag, whose default is prevented, so it never leaves focus behind.
 */
function useShowingProps(shown: boolean): HTMLAttributes<HTMLDivElement> {
  const [focused, setFocused] = useState(false);

  return {
    className: cn(handleClass, !(shown || focused) && 'opacity-0'),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}

/*
 * The grip draws on the card's actions lane: pointer drag, or ArrowUp and ArrowDown while it has focus. It shows only
 * on the card under the pointer, while it has focus and while its card is held; the rest of the time its lane keeps
 * its place, empty, so the title line never moves. A touch has no hover, so a touch screen shows no grip until a
 * press on its lane takes the card.
 */
export function ReorderHandle(props: ReorderHandleProps): ReactElement {
  const showing = useShowingProps(props.shown);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Reorder ${props.label}`}
      aria-roledescription="drag handle"
      {...showing}
      {...pointerHandlers(props)}
    >
      <Icon name="reorder" tone="muted" />
    </div>
  );
}
