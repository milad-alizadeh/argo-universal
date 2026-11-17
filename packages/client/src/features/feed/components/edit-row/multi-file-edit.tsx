import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from '@repo/kit/primitives/layout/collapsible';
import type * as React from 'react';
import type { FileDiff } from '../../view/file-diff';
import { FeedDisclosureLabel } from '../feed-disclosure-label';
import { FileEdit } from './file-edit';

interface MultiFileEditProps {
  files: readonly FileDiff[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

function MultiFileEditHeader({ count }: { count: number }): React.JSX.Element {
  const label = `Edited ${count} files`;

  return (
    <CollapsibleHeader icon="edit" label={label}>
      <FeedDisclosureLabel label={label} hovered={false} />
    </CollapsibleHeader>
  );
}

export function MultiFileEdit(props: MultiFileEditProps): React.JSX.Element {
  return (
    <Collapsible open={props.expanded} onOpenChange={props.onExpandedChange}>
      <MultiFileEditHeader count={props.files.length} />
      <CollapsibleContent className="gap-2 pt-2">
        {props.files.map((file) => (
          <FileEdit key={file.path} file={file} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
