import type * as React from 'react';
import { useRef } from 'react';
import { useDrawerFocus } from '../../hooks/use-drawer-focus.web';
import type { DrawerFocusScopeProps } from './drawer-focus-scope';

const column = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
} as const;

// A plain element so focus can be managed on it: closed it is `inert` and hidden, open it takes focus and holds it.
export function DrawerFocusScope({
  open,
  scrimLabel,
  children,
}: DrawerFocusScopeProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useDrawerFocus(ref, scrimLabel, open);

  return (
    <div ref={ref} aria-hidden={!open} style={column}>
      {children}
    </div>
  );
}
