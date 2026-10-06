import type { ToolCallUpdate } from '@repo/contracts';
import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Collapsible, CollapsibleContent } from '#primitives/collapsible';
import { Text, TextClassContext } from '#primitives/text';
import { type FileDiff, toFileDiffs } from '../feed/file-diff';
import { DiffView } from './DiffView';
import { DisclosureCaret } from './DisclosureCaret';
import { FileName } from './FileName';
import { fileTypeIcon } from './file-type-icon';
import { Icon } from './Icon';

export interface EditRowProps {
  row: ToolCallUpdate;
}

const editIcons = {
  modify: PencilSimpleIcon,
  add: PencilSimpleIcon,
  delete: TrashIcon,
  move: ArrowRightIcon,
};

const verbs = {
  modify: 'Edited',
  add: 'Added',
  delete: 'Deleted',
  move: 'Moved',
};

function FileEdit({
  file,
  nested = false,
}: {
  file: FileDiff;
  nested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const verb = verbs[file.operation];
  return (
    <Collapsible open={open} className="gap-2">
      <Button
        variant="link"
        aria-label={`${verb} ${file.path}`}
        aria-expanded={open}
        className="h-5 max-w-full self-start justify-start gap-1.5 rounded-none p-0 sm:h-5 has-[>svg]:px-0"
        onPress={() => setOpen(!open)}
      >
        <TextClassContext.Provider
          value={cn(
            'select-none text-sm font-normal leading-5 text-muted-foreground group-hover:text-foreground',
            open && 'text-foreground',
          )}
        >
          <Icon
            as={nested ? fileTypeIcon(file.path) : editIcons[file.operation]}
            className={cn('shrink-0', nested && 'text-muted-foreground')}
          />
          <View className="min-w-0 shrink flex-row items-center gap-1">
            {!nested && <Text selectable={false}>{verb}</Text>}
            <FileName path={file.oldPath ?? file.path} />
            {file.oldPath && (
              <>
                <Text selectable={false}>to</Text>
                <FileName path={file.path} />
              </>
            )}
            {file.added > 0 && (
              <Text selectable={false} className="text-success">
                +{file.added.toLocaleString('en-US')}
              </Text>
            )}
            {file.removed > 0 && (
              <Text selectable={false} className="text-destructive">
                -{file.removed.toLocaleString('en-US')}
              </Text>
            )}
            <DisclosureCaret open={open} />
          </View>
        </TextClassContext.Provider>
      </Button>
      <CollapsibleContent>
        <DiffView key={file.path} file={file} inline />
      </CollapsibleContent>
    </Collapsible>
  );
}

// One Tool call can edit several files; each expands its diff inline.
export function EditRow({ row }: EditRowProps) {
  const files = useMemo(
    () =>
      row.content.flatMap((block) =>
        block.type === 'diff' ? toFileDiffs(block) : [],
      ),
    [row.content],
  );
  const [expanded, setExpanded] = useState(false);
  if (row.status === 'failed') {
    const path = files[0]?.path ?? row.locations?.[0]?.path;
    const error = row.content
      .flatMap((block) =>
        block.type === 'content' && block.content.type === 'text'
          ? [block.content.text]
          : [],
      )
      .join(' ');
    return (
      <View className="min-h-5 flex-row items-center gap-1.5">
        <Icon as={PencilSimpleIcon} className="shrink-0 text-destructive" />
        <Text className="text-sm font-normal leading-5 text-destructive">
          Couldn't edit
        </Text>
        {path && (
          <FileName
            path={path}
            className="text-sm leading-5 text-muted-foreground"
          />
        )}
        {error && (
          <Text
            numberOfLines={1}
            className="min-w-0 shrink text-sm leading-5 text-muted-foreground"
          >
            · {error}
          </Text>
        )}
      </View>
    );
  }
  if (files.length === 1 && files[0]) return <FileEdit file={files[0]} />;
  return (
    <Collapsible open={expanded} className="gap-2">
      <Button
        variant="link"
        className="h-5 max-w-full self-start justify-start gap-1.5 rounded-none p-0 sm:h-5 has-[>svg]:px-0"
        aria-expanded={expanded}
        onPress={() => setExpanded(!expanded)}
      >
        <Icon as={PencilSimpleIcon} className="text-muted-foreground" />
        <Text
          selectable={false}
          className="select-none text-sm font-normal leading-5 text-muted-foreground"
        >
          Edited {files.length} files
        </Text>
        <DisclosureCaret open={expanded} />
      </Button>
      <CollapsibleContent className="gap-2">
        {files.map((file) => (
          <FileEdit key={file.path} file={file} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
