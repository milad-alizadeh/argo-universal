import type * as React from 'react';
import { EmptySessionOpening } from './opening';
import { SessionNewView } from './session-new-view';

export interface SessionNewScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

export function SessionNewScreen({
  projectId,
}: SessionNewScreenProps): React.JSX.Element {
  return (
    <EmptySessionOpening projectId={projectId}>
      {(props) => <SessionNewView {...props} />}
    </EmptySessionOpening>
  );
}
