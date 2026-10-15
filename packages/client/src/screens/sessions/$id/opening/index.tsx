import type * as React from 'react';
import type { NewSessionViewProps } from '../new-session-view';
import { toNewSessionViewProps } from './new-session-view-props';
import { openedSession, useOpenedConfiguration } from './opened-session';
import { useOpeningWiring } from './use-opening-wiring';

interface EmptySessionOpeningProps {
  projectId?: string;
  children: (props: NewSessionViewProps) => React.ReactNode;
}

// The connected screen sees only view props and callbacks; opening and hand-off stay here.
export function EmptySessionOpening({
  projectId,
  children,
}: EmptySessionOpeningProps): React.JSX.Element {
  const wiring = useOpeningWiring(projectId);
  const configuration = useOpenedConfiguration(openedSession(wiring));
  const view = toNewSessionViewProps({ ...wiring, configuration });

  return <>{children(view)}</>;
}
