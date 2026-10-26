import { Icon } from '@repo/kit/primitives/content/icon';
import type {
  HTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
} from 'react';
import type { ColumnRef } from './use-workbench-reorder';
import type { CardSlot, Grab } from './workbench-reorder-model';

export interface ReorderHandleProps {
  label: string;
  column: ColumnRef;
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

// The grip draws on the card's actions lane: pointer drag, or ArrowUp and ArrowDown while it has focus.
export function ReorderHandle(props: ReorderHandleProps): ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Reorder ${props.label}`}
      aria-roledescription="drag handle"
      className="flex h-6 w-8 cursor-grab touch-none select-none items-center justify-center rounded-control outline-none hover:bg-hover focus-visible:bg-hover active:cursor-grabbing"
      {...pointerHandlers(props)}
    >
      <Icon name="reorder" tone="muted" />
    </div>
  );
}
