import { Text } from '@repo/kit/primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from '@repo/kit/primitives/layout/collapsible';
import { fileTypeIcon } from '@repo/kit/symbols/file-type-icon';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import type { FileDiff } from '../../view/file-diff';
import { editVerbs, fileEditLabel } from '../../view/file-edit-label';
import { DiffView } from '../diff-view/diff-view';
import { FileName } from './file-name';

interface FileEditProps {
  file: FileDiff;
  nested?: boolean;
}

const editIcons = {
  modify: 'edit',
  add: 'edit',
  delete: 'delete',
  move: 'arrow-right',
} as const;

function MoveTarget({ file }: FileEditProps): React.JSX.Element | null {
  if (!file.oldPath) return null;

  return (
    <>
      <Text selectable={false}>to</Text>
      <FileName path={file.path} />
    </>
  );
}

function LineCount(props: {
  count: number;
  className: string;
  children: ReactNode;
}): React.JSX.Element | null {
  if (props.count <= 0) return null;

  return (
    <Text selectable={false} className={props.className}>
      {props.children}
    </Text>
  );
}

function LineCounts({ file }: FileEditProps): React.JSX.Element {
  return (
    <>
      <LineCount count={file.added} className="text-success">
        +{file.added.toLocaleString('en-US')}
      </LineCount>
      <LineCount count={file.removed} className="text-danger">
        −{file.removed.toLocaleString('en-US')}
      </LineCount>
    </>
  );
}

function FileEditSummary({ file, nested }: FileEditProps): React.JSX.Element {
  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      {!nested && <Text selectable={false}>{editVerbs[file.operation]}</Text>}
      <FileName path={file.oldPath ?? file.path} />
      <MoveTarget file={file} />
      <LineCounts file={file} />
    </View>
  );
}

function FileEditHeader({ file, nested }: FileEditProps): React.JSX.Element {
  return (
    <CollapsibleHeader
      label={fileEditLabel(file)}
      icon={nested ? fileTypeIcon(file.path) : editIcons[file.operation]}
      iconTone={nested ? 'muted' : undefined}
    >
      <FileEditSummary file={file} nested={nested} />
    </CollapsibleHeader>
  );
}

export function FileEdit(props: FileEditProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <FileEditHeader {...props} />
      {/* The space above opens with the content; a gap on the root would appear at once. */}
      <CollapsibleContent className="pt-2">
        <DiffView key={props.file.path} file={props.file} inline />
      </CollapsibleContent>
    </Collapsible>
  );
}
