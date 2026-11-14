import { InspectorBody } from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactElement } from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  type ChangesViewProps,
} from '#features/changes';

type Props = {
  changes?: ChangesViewProps;
};

const ignore = (): void => {};

// The Session's own Checkout, as its changed files; pull requests are not shown here (ADR-0052).
export function SessionChangesTab({ changes }: Props): ReactElement {
  return (
    <InspectorBody
      title="Changes"
      open
      onOpenChange={ignore}
      surface="bg-transparent"
      toolbar={changes && <ChangesToolbar {...changes} />}
      // The files are their own virtualised list.
      contentScrolls
    >
      {changes && <ChangesFiles {...changes} />}
    </InspectorBody>
  );
}
