import type * as React from 'react';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/display/collapsible/collapsible';
import { DisclosureChevron } from '#primitives/display/disclosure-chevron/disclosure-chevron';
import { Text } from '#primitives/display/text/text';
import { Pressable } from '#primitives/pressable/pressable';
import { Icon } from '../../../../lib/generic/symbols/icon';
import type { FileDiff } from '../../view/file-diff';
import { editToggleClassName, FileEdit } from './file-edit';

interface MultiFileEditProps {
  files: readonly FileDiff[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

function EditedCount({ count }: { count: number }): React.JSX.Element {
  return (
    <Text
      selectable={false}
      role="body"
      className="select-none text-muted-foreground"
    >
      Edited {count} files
    </Text>
  );
}

function MultiFileToggle(props: MultiFileEditProps): React.JSX.Element {
  return (
    <Pressable
      aria-expanded={props.expanded}
      onPress={() => props.onExpandedChange(!props.expanded)}
      role="button"
      className={editToggleClassName}
    >
      <Icon name="edit" role="body" className="text-muted-foreground" />
      <EditedCount count={props.files.length} />
      <DisclosureChevron open={props.expanded} />
    </Pressable>
  );
}

export function MultiFileEdit(props: MultiFileEditProps): React.JSX.Element {
  return (
    <Collapsible open={props.expanded}>
      <MultiFileToggle {...props} />
      <CollapsibleContent className="gap-2 pt-2">
        {props.files.map((file) => (
          <FileEdit key={file.path} file={file} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
