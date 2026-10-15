import type * as React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from '#primitives/display/collapsible';
import type { FileDiff } from '../../view/file-diff';
import { FileEdit } from './file-edit';

interface MultiFileEditProps {
  files: readonly FileDiff[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function MultiFileEdit(props: MultiFileEditProps): React.JSX.Element {
  return (
    <Collapsible open={props.expanded} onOpenChange={props.onExpandedChange}>
      <CollapsibleHeader
        icon="edit"
        label={`Edited ${props.files.length} files`}
      />
      <CollapsibleContent className="gap-2 pt-2">
        {props.files.map((file) => (
          <FileEdit key={file.path} file={file} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
