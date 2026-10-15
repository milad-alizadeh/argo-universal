import type * as React from 'react';
import type { SessionNewViewProps } from '../session-new-view';
import { openedSession, useOpenedConfiguration } from './opened-session';
import { toSessionNewViewProps } from './session-new-view-props';
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
  const configuration = useOpenedConfiguration(openedSession(wiring));
  const view = toSessionNewViewProps({ ...wiring, configuration });

  return <>{children(view)}</>;
}
