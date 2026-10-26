import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { EmptySessionOpening } from './opening';
import { SessionNewView } from './session-new-view';

export interface SessionNewScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
  // The Composer text a Plugin opened this page with, in place of the kept draft.
  draft?: string;
}

export function SessionNewScreen({
  projectId,
  draft,
}: SessionNewScreenProps): React.JSX.Element {
  // The header stays empty until the first prompt starts the Session and gives it a title.
  return (
    <>
      <ScreenStackHeader title="" />
      <EmptySessionOpening projectId={projectId} draft={draft}>
        {(props) => <SessionNewView {...props} />}
      </EmptySessionOpening>
    </>
  );
}
