import type * as React from 'react';
import { Code, DiffScroll } from '#primitives/content/code';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/layout/collapsible';
import { FileHeader } from './diff-file-header';
import { type DiffViewProps, useDiffViewState } from './diff-view-state';

export type { DiffViewProps } from './diff-view-state';

// Inline patches are Code; the Inspector adds its file header and Viewed fold around the same hunk drawing.
export function DiffView(props: DiffViewProps): React.JSX.Element {
  if (props.inline)
    return <Code path={props.file.path} diff={props.file.hunks} />;

  return <InspectorDiff {...props} />;
}

function InspectorDiff(props: DiffViewProps): React.JSX.Element {
  const view = useDiffViewState(props);

  return (
    <Collapsible open={view.open} className="min-w-0" testID="diff-view">
      <FileHeader {...view} />
      <CollapsibleContent className="bg-card py-2 medium:bg-content medium:py-0">
        <DiffScroll
          hunks={view.file.hunks}
          inline={false}
          path={view.file.path}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
