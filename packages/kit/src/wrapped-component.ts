import type { ReactElement } from 'react';

type Component = Exclude<ReactElement['type'], string>;

const wraps = new WeakMap<Component, Component>();

const markPrefix = 'argo.kit.';

/*
 * A wrapper that draws a kit component in its place is read by a parent as that component: it is recorded here
 * and takes the marks the component wore.
 */
export function wrappingComponent<Wrapper extends Component>(
  wrapper: Wrapper,
  wrapped: Component,
): Wrapper {
  for (const mark of Object.getOwnPropertySymbols(wrapped))
    if (mark.description?.startsWith(markPrefix))
      Object.defineProperty(wrapper, mark, { value: true, configurable: true });

  // A wrapper of a wrapper reads as the kit component at the end of the chain.
  wraps.set(wrapper, wraps.get(wrapped) ?? wrapped);

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
