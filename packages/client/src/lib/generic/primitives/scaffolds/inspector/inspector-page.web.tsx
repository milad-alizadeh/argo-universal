import type { ReactElement, ReactNode } from 'react';
import type { InspectorPageProps } from './inspector-page';

export function InspectorPages({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
  );
}

// Hiding without changing layout keeps virtualised lists from rebasing their scroll positions.
export function InspectorPage(props: InspectorPageProps): ReactElement {
  return (
    <div
      role="tabpanel"
      aria-label={props.label}
      aria-hidden={!props.active}
      inert={!props.active}
      className="absolute inset-0 flex min-h-0 flex-col"
      style={{ visibility: props.active ? 'visible' : 'hidden' }}
    >
      {props.children}
    </div>
  );
}
