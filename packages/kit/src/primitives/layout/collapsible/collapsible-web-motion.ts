import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ViewInstance } from 'react-native';
import { duration } from './collapsible-context';

/*
 * The web's open and close: the box around the content moves its height with a CSS transition, aimed at the height
 * the content lays out at. A ResizeObserver reads that height once the browser has laid the content out, and again
 * whenever it changes while the box moves, so content that settles after it mounts (a placeholder giving way, a
 * Plugin's tree arriving, a late glyph) turns the motion towards where it will rest instead of overshooting it and
 * snapping back at the end. At rest the box takes its content's height, so content that changes while open is never
 * clipped. The curve and length are the chevron's, Easing.inOut(Easing.quad) over the same 200ms, so the two move as
 * one. Reduced motion takes one step each way.
 */
const curve = 'cubic-bezier(0.455, 0.03, 0.515, 0.955)';

const motion = `height ${duration}ms ${curve}`;

// Ends a motion whose transitionend never comes, such as one aimed at the height the box already has.
const fallbackAfter = duration * 2;

const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const domNode = (view: RefObject<ViewInstance | null>): HTMLElement | null =>
  view.current instanceof HTMLElement ? view.current : null;

const heightOf = (node: HTMLElement): number =>
  node.getBoundingClientRect().height;

// The box's height comes from its content again, with nothing to move.
function rest(box: HTMLElement): void {
  box.style.transition = '';
  box.style.height = '';
}

// Pins the box at the height it has now, so the next height it is given moves from there.
function hold(box: HTMLElement, height: number): void {
  box.style.transition = 'none';
  box.style.height = `${height}px`;
  void box.offsetHeight;
}

const moving = (box: HTMLElement): boolean => box.style.height !== '';

type Node = RefObject<ViewInstance | null>;

interface Nodes {
  box: Node;
  content: Node;
}

interface MotionState {
  open: boolean;
  forceMount: boolean;
  unmount: () => void;
}

function useFinish(state: RefObject<MotionState>) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const finish = useCallback(
    (box: HTMLElement): void => {
      clearTimeout(timer.current);
      if (state.current.open) return rest(box);
      if (!state.current.forceMount) state.current.unmount();
    },
    [state],
  );

  const moveTo = useCallback(
    (box: HTMLElement, height: number): void => {
      box.style.transition = motion;
      box.style.height = `${height}px`;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => finish(box), fallbackAfter);
    },
    [finish],
  );

  return { finish, moveTo };
}

type MoveTo = (box: HTMLElement, height: number) => void;

function close(box: HTMLElement, state: MotionState, moveTo: MoveTo): void {
  if (reducedMotion()) {
    hold(box, 0);
    if (!state.forceMount) state.unmount();

    return;
  }

  if (!moving(box)) hold(box, heightOf(box));
  moveTo(box, 0);
}

// Content already there turns back towards its height; content that has just mounted starts at nothing and waits for its first layout.
function open(box: HTMLElement, content: HTMLElement | null, moveTo: MoveTo): void {
  if (reducedMotion()) return rest(box);
  if (content) moveTo(box, heightOf(content));
  else hold(box, 0);
}

// While the box moves towards its content, each new height the content lays out at becomes where it heads.
function useFollowContent(
  nodes: Nodes & { mounted: boolean },
  state: RefObject<MotionState>,
  moveTo: MoveTo,
): void {
  const { box: boxView, content: contentView, mounted } = nodes;
  useLayoutEffect(() => {
    const content = domNode(contentView);
    if (!mounted || !content) return;
    const observer = new ResizeObserver(() => {
      const box = domNode(boxView);
      if (box && state.current.open && moving(box))
        moveTo(box, heightOf(content));
    });
    observer.observe(content);

    return () => observer.disconnect();
  }, [mounted, boxView, contentView, state, moveTo]);
}

function useTransitionEnd(
  boxView: Node,
  finish: (box: HTMLElement) => void,
  mounted: boolean,
): void {
  useLayoutEffect(() => {
    const box = domNode(boxView);
    if (!mounted || !box) return;
    const onEnd = (event: TransitionEvent): void => {
      if (event.target === box && event.propertyName === 'height') finish(box);
    };
    box.addEventListener('transitionend', onEnd);

    return () => box.removeEventListener('transitionend', onEnd);
  }, [boxView, finish, mounted]);
}

function useMotionState(isOpen: boolean, forceMount: boolean) {
  const [mounted, setMounted] = useState(isOpen || forceMount);
  if (isOpen && !mounted) setMounted(true);
  const unmount = useCallback(() => setMounted(false), []);
  const state = useRef<MotionState>({ open: isOpen, forceMount, unmount });
  state.current = { open: isOpen, forceMount, unmount };

  return { mounted, state };
}

// Starts the motion each time the content opens or closes; content that mounts open, as a card shown open does, rests as it is.
function useStartMotion(
  nodes: Nodes & { isOpen: boolean; mounted: boolean },
  state: RefObject<MotionState>,
  moveTo: MoveTo,
): void {
  const { box: boxView, content: contentView, isOpen, mounted } = nodes;
  const seen = useRef<{ box: HTMLElement | null; first: boolean }>({
    box: null,
    first: true,
  });
  useLayoutEffect(() => {
    const box = domNode(boxView);
    const { first, box: previous } = seen.current;
    seen.current = { box, first: false };
    if (!box || (first && isOpen)) return;
    if (!isOpen) return first ? hold(box, 0) : close(box, state.current, moveTo);
    open(box, box === previous ? domNode(contentView) : null, moveTo);
  }, [boxView, contentView, isOpen, mounted, state, moveTo]);
}

export function useWebContentMotion(
  isOpen: boolean,
  forceMount = false,
): Nodes & { mounted: boolean } {
  const box = useRef<ViewInstance>(null);
  const content = useRef<ViewInstance>(null);
  const { mounted, state } = useMotionState(isOpen, forceMount);
  const { finish, moveTo } = useFinish(state);
  useStartMotion({ box, content, isOpen, mounted }, state, moveTo);
  useFollowContent({ box, content, mounted }, state, moveTo);
  useTransitionEnd(box, finish, mounted);

  return { box, content, mounted };
}
