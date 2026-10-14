import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { fileTypeIcon } from '#lib/generic/symbols/file-type-icon';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/buttons/button';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/display/collapsible';
import { DisclosureChevron } from '#primitives/display/disclosure-chevron';
import { Icon } from '#primitives/display/icon';
import { Text, TextClassContext } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import type { FileDiff } from '../../view/file-diff';
import { DiffView } from '../diff-view/diff-view';
import { FileName } from './file-name';

interface FileEditProps {
  file: FileDiff;
  nested?: boolean;
}

interface FileEditLabelProps extends FileEditProps {
  open: boolean;
}

export const editToggleClassName = contentActionClass({
  variant: 'link',
  className:
    'h-auto max-w-full self-start justify-start gap-1.5 rounded-none p-0 sm:h-auto has-[>[data-icon]]:px-0',
});

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

function FileEditIcon({ file, nested }: FileEditProps): React.JSX.Element {
  return (
    <Icon
      name={nested ? fileTypeIcon(file.path) : editIcons[file.operation]}
      role="body"
      className={cn('shrink-0', nested && 'text-muted-foreground')}
    />
  );
}

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
        -{file.removed.toLocaleString('en-US')}
      </LineCount>
    </>
  );
}

function FileEditSummary(props: FileEditLabelProps): React.JSX.Element {
  const { file } = props;

  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      {!props.nested && <Text selectable={false}>{verbs[file.operation]}</Text>}
      <FileName path={file.oldPath ?? file.path} />
      <MoveTarget file={file} />
      <LineCounts file={file} />
      <DisclosureChevron open={props.open} />
    </View>
  );
}

function FileEditLabel(props: FileEditLabelProps): React.JSX.Element {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none type-body text-muted-foreground group-hover:text-foreground',
        props.open && 'text-foreground',
      )}
    >
      <FileEditIcon {...props} />
      <FileEditSummary {...props} />
    </TextClassContext.Provider>
  );
}

function FileEditToggle(
  props: FileEditLabelProps & { onToggle: () => void },
): React.JSX.Element {
  return (
    <Pressable
      aria-label={`${verbs[props.file.operation]} ${props.file.path}`}
      aria-expanded={props.open}
      onPress={props.onToggle}
      role="button"
      className={editToggleClassName}
    >
      <FileEditLabel {...props} />
    </Pressable>
  );
}

export function FileEdit(props: FileEditProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open}>
      <FileEditToggle {...props} open={open} onToggle={() => setOpen(!open)} />
      {/* The space above opens with the content; a gap on the root would appear at once. */}
      <CollapsibleContent className="pt-2">
        <DiffView key={props.file.path} file={props.file} inline />
      </CollapsibleContent>
    </Collapsible>
  );
}
