import type { ReactElement, ReactNode } from 'react';
import type { InspectorScreenProps } from './inspector-screen';

export function InspectorScreens({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
  );
}

/*
 * Hiding without changing layout keeps virtualised lists from rebasing their scroll positions. An active screen
 * inherits rather than asking for visible, which would paint a nested screen through the hidden tab around it.
 */
export function InspectorScreen(props: InspectorScreenProps): ReactElement {
  return (
    <div
      role="tabpanel"
      aria-label={props.label}
      aria-hidden={!props.active}
      inert={!props.active}
      className="absolute inset-0 flex min-h-0 flex-col"
      style={{ visibility: props.active ? 'inherit' : 'hidden' }}
    >
      {props.children}
    </div>
  );
}
