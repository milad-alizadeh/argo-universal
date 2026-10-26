import { useRef, useState, type RefObject } from 'react';
import {
  clamp,
  dropIndex,
  moveCard,
  type Grab,
  type Drag,
} from './workbench-reorder-model';

export interface Gesture {
  drag: Drag | null;
  begin: (id: string, grab: Grab) => void;
  move: (pointerY: number) => void;
  end: () => void;
  cancel: () => void;
  nudge: (id: string, by: -1 | 1) => void;
}

interface GestureArgs {
  shown: readonly string[];
  reorder: (order: string[]) => void;
}

interface Context extends GestureArgs {
  drag: Drag | null;
  setDrag: (drag: Drag | null | ((held: Drag | null) => Drag | null)) => void;
  pointerStart: RefObject<number>;
}

function end(context: Context): void {
  const { drag, shown } = context;

  if (drag) context.reorder(moveCard(shown, drag.from, dropIndex(drag)));
  context.setDrag(null);
}

function nudge({ shown, reorder }: GestureArgs, id: string, by: -1 | 1): void {
  const from = shown.indexOf(id);

  reorder(moveCard(shown, from, clamp(from + by, 0, shown.length - 1)));
}

// The slots are measured by the handle as it is taken, so a card that grew or shrank since is as it is now.
function begin(context: Context, id: string, grab: Grab): void {
  context.pointerStart.current = grab.pointerY;
  context.setDrag({
    id,
    from: context.shown.indexOf(id),
    slots: grab.slots,
    offset: 0,
  });
}

function move(context: Context, pointerY: number): void {
  context.setDrag((held) =>
    held ? { ...held, offset: pointerY - context.pointerStart.current } : null,
  );
}

// A card is held by its handle: the pointer moves it, and letting go drops it where its middle has reached.
export function useReorderGesture(args: GestureArgs): Gesture {
  const [drag, setDrag] = useState<Drag | null>(null);
  const pointerStart = useRef(0);
  const context: Context = { ...args, drag, setDrag, pointerStart };

  return {
    drag,
    begin: (id, grab) => begin(context, id, grab),
    move: (pointerY) => move(context, pointerY),
    end: () => end(context),
    cancel: () => setDrag(null),
    nudge: (id, by) => nudge(args, id, by),
  };
}
