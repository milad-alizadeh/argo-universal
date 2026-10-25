import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
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
  // The header stays empty until the first prompt starts the Session and gives it a title.
  return (
    <>
      <ScreenStackHeader title="" />
      <EmptySessionOpening projectId={projectId}>
        {(props) => <SessionNewView {...props} />}
      </EmptySessionOpening>
    </>
  );
}
