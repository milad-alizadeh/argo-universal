import type { ReactElement } from 'react';

type Component = Exclude<ReactElement['type'], string>;

const wraps = new WeakMap<Component, Component>();

const markPrefix = 'argo.kit.';

/*
 * A dev-only wrapper that draws a kit component in its place, as the App's Draft comment mode does, is read by a
 * parent as that component: it is recorded here and takes the marks the component wore.
 */
export function wrappingComponent<Wrapper extends Component>(
  wrapper: Wrapper,
  wrapped: Component,
): Wrapper {
  for (const mark of Object.getOwnPropertySymbols(wrapped))
    if (mark.description?.startsWith(markPrefix))
      Object.defineProperty(wrapper, mark, { value: true, configurable: true });

  wraps.set(wrapper, wrapped);

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
