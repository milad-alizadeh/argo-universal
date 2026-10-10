import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
} from '#lib/generic/primitives/collapsible';
import { Text, TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon } from '../../../lib/generic/symbols/icon';
import { type FileDiff, toFileDiffs } from '../view/file-diff';
import { DiffView } from './diff-view';
import { DisclosureCaret } from './disclosure-caret';
import { FileName } from './file-name';
import { fileTypeIcon } from './file-type-icon';
import { ToolOutput } from './tool-output';

export interface EditRowProps {
  row: ToolCallUpdate;
}

const editIcons = {
  modify: 'edit',
  add: 'edit',
  delete: 'delete',
  move: 'arrow-right',
} as const;

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
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const verb = verbs[file.operation];
  return (
    <Collapsible open={open}>
      <Pressable
        aria-label={`${verb} ${file.path}`}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        role="button"
        className={contentActionClass({
          variant: 'link',
          className:
            'h-auto max-w-full self-start justify-start gap-1.5 rounded-none p-0 sm:h-auto has-[>[data-icon]]:px-0',
        })}
      >
        <TextClassContext.Provider
          value={cn(
            'select-none type-body text-muted-foreground group-hover:text-foreground',
            open && 'text-foreground',
          )}
        >
          <Icon
            name={nested ? fileTypeIcon(file.path) : editIcons[file.operation]}
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
      </Pressable>
      {/* The space above opens with the content; a gap on the root would appear at once. */}
      <CollapsibleContent className="pt-2">
        <DiffView key={file.path} file={file} inline />
      </CollapsibleContent>
    </Collapsible>
  );
}

// One Tool call can edit several files; each expands its diff inline.
function FileEdits({ row }: EditRowProps): React.JSX.Element {
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
        <Icon name="edit" className="shrink-0 text-destructive" />
        <Text className="type-body text-destructive">Couldn't edit</Text>
        {path ? (
          <FileName path={path} className="text-muted-foreground" />
        ) : null}
        {error ? (
          <Text
            numberOfLines={1}
            className="min-w-0 shrink type-body text-muted-foreground"
          >
            · {error}
          </Text>
        ) : null}
      </View>
    );
  }
  if (files.length === 1 && files[0]) return <FileEdit file={files[0]} />;
  return (
    <Collapsible open={expanded}>
      <Pressable
        aria-expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        role="button"
        className={contentActionClass({
          variant: 'link',
          className:
            'h-auto max-w-full self-start justify-start gap-1.5 rounded-none p-0 sm:h-auto has-[>[data-icon]]:px-0',
        })}
      >
        <Icon name="edit" className="text-muted-foreground" />
        <Text
          selectable={false}
          className="select-none type-body text-muted-foreground"
        >
          Edited {files.length} files
        </Text>
        <DisclosureCaret open={expanded} />
      </Pressable>
      <CollapsibleContent className="gap-2 pt-2">
        {files.map((file) => (
          <FileEdit key={file.path} file={file} nested />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EditRow({ row }: EditRowProps): React.JSX.Element {
  return (
    <View className="gap-2">
      <FileEdits row={row} />
      <ToolOutput
        content={row.content.filter((block) => block.type !== 'diff')}
      />
    </View>
  );
}
