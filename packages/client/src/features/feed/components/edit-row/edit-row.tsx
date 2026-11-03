import {
  isToolCallRunning,
  type ToolCallContent,
  type ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { use, useMemo, useState } from 'react';
import { View } from 'react-native';
import { type FileDiff, toFileDiffs } from '../../view/file-diff';
import { toolCallTitle } from '../../view/tool-call-title';
import { ShimmerText } from '../shimmer-text';
import { GroupLiveId } from '../tool-call-group/group-live-id';
import { ToolOutput } from '../tool-output';
import { FailedEdit } from './failed-edit';
import { FileEdit } from './file-edit';
import { MultiFileEdit } from './multi-file-edit';

export interface EditRowProps {
  row: ToolCallUpdate;
}

const diffFiles = (content: readonly ToolCallContent[]): FileDiff[] =>
  content.flatMap((block) => (block.type === 'diff' ? toFileDiffs(block) : []));

const soleFile = (files: readonly FileDiff[]): FileDiff | undefined =>
  files.length === 1 ? files[0] : undefined;

// One Tool call can edit several files; each expands its diff inline.
function FileEdits({ row }: EditRowProps): React.JSX.Element {
  const files = useMemo(() => diffFiles(row.content), [row.content]);
  const [expanded, setExpanded] = useState(false);
  const single = soleFile(files);

  if (row.status === 'failed') return <FailedEdit row={row} files={files} />;

  if (single) return <FileEdit file={single} />;

  return (
    <MultiFileEdit
      files={files}
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  );
}

function EditActivity({
  row,
  titleInGroup,
}: EditRowProps & { titleInGroup: boolean }): React.JSX.Element | null {
  if (!isToolCallRunning(row) || titleInGroup) return null;

  return <ShimmerText text={toolCallTitle(row)} />;
}

export function EditRow({ row }: EditRowProps): React.JSX.Element {
  const titleInGroup = use(GroupLiveId) === row.id;

  return (
    <View className="gap-2">
      <EditActivity row={row} titleInGroup={titleInGroup} />
      <FileEdits row={row} />
      <ToolOutput
        content={row.content.filter((block) => block.type !== 'diff')}
      />
    </View>
  );
}
