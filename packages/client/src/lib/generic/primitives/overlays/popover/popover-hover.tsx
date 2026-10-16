import * as React from 'react';
import type { OpenState } from '#primitives/overlays/open-state';
import { usePopoverState } from './popover-context';

const closeGraceMs = 50;

export interface Hover {
  enter: () => void;
  leave: () => void;
  promote: () => void;
  isPointer: () => boolean;
}

interface Timer {
  close: () => void;
  cancel: () => void;
  schedule: () => void;
}

type Intent = ReturnType<typeof useHoverIntent>;

interface HoverIntent {
  isPointer: () => boolean;
  mark: () => void;
  promote: () => void;
}

type Root = OpenState;

interface HoverEnvironment {
  parent?: Hover;
  group?: Set<() => void>;
  timer: Timer;
  intent: Intent;
}

export const PopoverHover = React.createContext<Hover | undefined>(undefined);

const HoverGroup = React.createContext<Set<() => void> | undefined>(undefined);

export function PopoverHoverGroup({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [members] = React.useState(() => new Set<() => void>());

  return <HoverGroup value={members}>{children}</HoverGroup>;
}

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
  React.useEffect(() => register(group, timer.close), [group, timer.close]);

  return hoverActions(context, { parent, group, intent, timer });
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

function useHoverTimer(onOpenChange: (open: boolean) => void): Timer {
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = React.useCallback(() => cancelPending(pending.current), []);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  React.useEffect(() => cancel, [cancel]);

  const schedule = (): void => {
    cancel();
    pending.current = setTimeout(close, closeGraceMs);
  };

  return { close, cancel, schedule };
}

function cancelPending(pending: ReturnType<typeof setTimeout> | null): void {
  if (pending) clearTimeout(pending);
}

function hoverActions(context: Root, environment: HoverEnvironment): Hover {
  return {
    isPointer: environment.intent.isPointer,
    promote: () => {
      environment.intent.promote();
      environment.timer.cancel();
    },
    enter: () => enter(context, environment),
    leave: () => leave(environment),
  };
}

function enter(context: Root, environment: HoverEnvironment): void {
  environment.timer.cancel();
  environment.parent?.enter();

  if (!context.open) environment.intent.mark();
  closeSiblings(environment.group, environment.timer.close);
  context.onOpenChange(true);
}

function leave(environment: HoverEnvironment): void {
  if (!environment.intent.isPointer()) return;
  environment.parent?.leave();
  environment.timer.schedule();
}

function closeSiblings(
  group: Set<() => void> | undefined,
  current: () => void,
): void {
  group?.forEach((close) => {
    if (close !== current) close();
  });
}

function register(
  group: Set<() => void> | undefined,
  close: () => void,
): () => void {
  group?.add(close);

  return () => {
    group?.delete(close);
  };
}
