import type { ReactElement } from 'react';

// Where a wrapper keeps the component it draws in place of.
const wrapsKey = Symbol.for('argo.kit.wraps');

/*
 * A dev-only wrapper that draws a kit component in its place, as the App's Draft comment mode does, carries the
 * component and the marks it wore, so a parent that reads its children by type still recognises them.
 */
export function wrappingComponent<Wrapper extends object>(
  wrapper: Wrapper,
  wrapped: object,
): Wrapper {
  for (const key of Reflect.ownKeys(wrapped))
    if (typeof key === 'symbol' && key.description?.startsWith('argo.kit.'))
      Object.defineProperty(wrapper, key, { value: true, configurable: true });

  Object.defineProperty(wrapper, wrapsKey, { value: wrapped });

  return wrapper;
}

/*
 * The type a parent compares an element's against: the component a wrapper draws in place of, or the element's own
 * type. Read a child's type through this, never `child.type`, wherever a kit component reads its children by type.
 */
export function kitTypeOf(element: ReactElement): unknown {
  const { type } = element;

  if (typeof type !== 'function' && typeof type !== 'object') return type;

  return (type !== null && Reflect.get(type, wrapsKey)) || type;
}
