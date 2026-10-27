import { createElement, type ReactNode } from 'react';
import { useListLook } from '../../../list-look-context';
import { moveBetweenRows } from './list-menu-keys';

// A web popover's List takes the arrow keys, Home and End between its rows; other popover content keeps its own keys.
export function ListMenuRows({ children }: { children: ReactNode }): ReactNode {
  if (!useListLook().menu) return children;

  return createElement(
    'div',
    { className: 'contents', onKeyDown: moveBetweenRows },
    children,
  );
}
