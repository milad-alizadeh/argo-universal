import type * as React from 'react';
import type { SessionNewViewProps } from '../session-new-view';
import { openedSession, useOpenedConfiguration } from './opened-session';
import { toSessionNewViewProps } from './session-new-view-props';
import { useNewSessionCallout } from './use-new-session-callout';
import { useOpeningWiring } from './use-opening-wiring';

interface EmptySessionOpeningProps {
  projectId?: string;
  children: (props: SessionNewViewProps) => React.ReactNode;
}

// The connected screen sees only view props and callbacks; opening and hand-off stay here.
export function EmptySessionOpening({
  projectId,
  children,
}: EmptySessionOpeningProps): React.JSX.Element {
  const wiring = useOpeningWiring(projectId);
  const options = useOpenedConfiguration(openedSession(wiring));
  const callout = useNewSessionCallout({ ...wiring, ...options });
  const view = toSessionNewViewProps({ ...wiring, ...options, callout });

  return <>{children(view)}</>;
}
