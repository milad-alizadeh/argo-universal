import { createContext, type ReactElement } from 'react';

type Component = Exclude<ReactElement['type'], string>;

// Declarative kit children are drawn by their parent. Carry their wrapper to the drawing it makes.
export type KitDrawingHit = (point: { x: number; y: number }) => boolean;

export type KitDrawingWrapper = (
  drawing: ReactElement,
  hit?: KitDrawingHit,
) => ReactElement;

export type ScheduleDrawingSelection = (select: () => void) => void;

export type KitDrawingSelection = (
  schedule: ScheduleDrawingSelection,
) => boolean;

// A menu item gives its wrapper the close lifecycle before selecting its drawing.
export const KitDrawingSelectionContext =
  createContext<KitDrawingSelection | null>(null);

const drawings = new WeakMap<Component, KitDrawingWrapper>();

export function kitDrawingWrapper(
  element: ReactElement,
): KitDrawingWrapper | undefined {
  return typeof element.type === 'string'
    ? undefined
    : drawings.get(element.type);
}

export const wrapKitDrawing = (
  wrap: KitDrawingWrapper | undefined,
  drawing: ReactElement,
  hit?: KitDrawingHit,
): ReactElement => wrap?.(drawing, hit) ?? drawing;

const wraps = new WeakMap<Component, Component>();

const markPrefix = 'argo.kit.';

/*
 * A wrapper that draws a kit component in its place is read by a parent as that component: it is recorded here
 * and takes the marks the component wore.
 */
export function wrappingComponent<Wrapper extends Component>(
  wrapper: Wrapper,
  wrapped: Component,
  drawing?: KitDrawingWrapper,
): Wrapper {
  for (const mark of Object.getOwnPropertySymbols(wrapped))
    if (mark.description?.startsWith(markPrefix))
      Object.defineProperty(wrapper, mark, { value: true, configurable: true });

  // A wrapper of a wrapper reads as the kit component at the end of the chain.
  wraps.set(wrapper, wraps.get(wrapped) ?? wrapped);

  if (drawing) drawings.set(wrapper, drawing);

  return wrapper;
}

/*
 * The type a parent compares an element's against: the component a wrapper draws in place of, or the element's own
 * type. Read a child's type through this, never `child.type`, wherever a kit component reads its children by type.
 */
export function kitTypeOf(element: ReactElement): ReactElement['type'] {
  const { type } = element;

  if (typeof type === 'string') return type;

  return wraps.get(type) ?? type;
}
