import type * as React from 'react';
import { NewSessionView } from './new-session-view';
import { EmptySessionOpening } from './opening';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  return (
    <EmptySessionOpening projectId={projectId}>
      {(props) => <NewSessionView {...props} />}
    </EmptySessionOpening>
  );
}
