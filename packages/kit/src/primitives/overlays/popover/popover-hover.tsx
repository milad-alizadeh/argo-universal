import * as React from 'react';
import type { OpenState } from '#primitives/overlays/open-state';
import { usePopoverState } from './popover-context';
import { HoverGroup, closeSiblings, register } from './popover-hover-group';
import { type HoverTimer, useHoverTimer } from './popover-hover-timer';

/*
 * The parts the pointer can rest on: the trigger, the content, or a nested popover's own parts.
 * A browser reports the content's enter before the trigger's leave, so the popover closes only once
 * the pointer has left every part, whatever order their events arrive in.
 */
type HoverPart = 'trigger' | 'content' | (string & {});

export interface Hover {
  enter: (part: HoverPart) => void;
  leave: (part: HoverPart) => void;
  promote: () => void;
  isPointer: () => boolean;
}

type Intent = ReturnType<typeof useHoverIntent>;

interface HoverIntent {
  isPointer: () => boolean;
  mark: () => void;
  promote: () => void;
}

type Root = OpenState;

interface HoverEnvironment {
  id: string;
  parent?: Hover;
  group?: Set<() => void>;
  timer: HoverTimer;
  intent: Intent;
  hovered: Set<HoverPart>;
}

export const PopoverHover = React.createContext<Hover | undefined>(undefined);

export function HoverProvider({
  enabled,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const hover = useHover();

  return (
    <PopoverHover value={enabled ? hover : undefined}>{children}</PopoverHover>
  );
}

function useHover(): Hover {
  const context = usePopoverState();
  const parent = React.useContext(PopoverHover);
  const group = React.useContext(HoverGroup);
  const intent = useHoverIntent();
  const timer = useHoverTimer(context.onOpenChange);
  const id = React.useId();
  const [hovered] = React.useState(() => new Set<HoverPart>());
  React.useEffect(() => register(group, timer.close), [group, timer.close]);
  React.useEffect(() => {
    if (!context.open) forget({ id, parent, hovered });
  }, [context.open, id, parent, hovered]);

  return hoverActions(context, { id, parent, group, intent, timer, hovered });
}

// A closed popover holds no pointer: its parts unmount without reporting a leave.
function forget(
  environment: Pick<HoverEnvironment, 'id' | 'parent' | 'hovered'>,
): void {
  if (environment.hovered.size === 0) return;
  environment.hovered.clear();
  environment.parent?.leave(environment.id);
}

function useHoverIntent(): HoverIntent {
  const pointer = React.useRef(false);

  return {
    isPointer: () => pointer.current,
    mark: () => {
      pointer.current = true;
    },
    promote: () => {
      pointer.current = false;
    },
  };
}

function hoverActions(context: Root, environment: HoverEnvironment): Hover {
  return {
    isPointer: environment.intent.isPointer,
    promote: () => {
      environment.intent.promote();
      environment.timer.cancel();
    },
    enter: (part) => enter(context, environment, part),
    leave: (part) => leave(environment, part),
  };
}

function enter(
  context: Root,
  environment: HoverEnvironment,
  part: HoverPart,
): void {
  environment.timer.cancel();
  markHovered(environment, part);
  openFromHover(context, environment);
}

// The parent hears of this popover once, when its first part is hovered.
function markHovered(environment: HoverEnvironment, part: HoverPart): void {
  if (environment.hovered.size === 0) environment.parent?.enter(environment.id);
  environment.hovered.add(part);
}

function openFromHover(context: Root, environment: HoverEnvironment): void {
  if (!context.open) environment.intent.mark();
  closeSiblings(environment.group, environment.timer.close);
  context.onOpenChange(true);
}

function leave(environment: HoverEnvironment, part: HoverPart): void {
  if (!leftLastPart(environment.hovered, part)) return;

  environment.parent?.leave(environment.id);
  scheduleClose(environment);
}

const leftLastPart = (hovered: Set<HoverPart>, part: HoverPart): boolean =>
  hovered.delete(part) && hovered.size === 0;

function scheduleClose(environment: HoverEnvironment): void {
  if (environment.intent.isPointer()) environment.timer.schedule();
}
