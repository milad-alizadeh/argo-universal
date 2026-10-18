import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { CopyButton } from '#lib/product/markdown/copy-button';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text, TextClassContext } from '#primitives/content/text';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { FileDiff } from '../../view/file-diff';

export interface FileHeaderProps {
  file: FileDiff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toggleClassName = contentActionClass({
  variant: 'link',
  className: 'h-5 min-w-0 flex-1 justify-start gap-2 rounded-none p-0 sm:h-5',
});

// Isolates the folder so the right-to-left web layout, which keeps its end in view, cannot reorder it.
const shownFolder = (folder: string): string =>
  Platform.OS === 'web' ? `⁦${folder}⁩` : folder;

function FolderName({ folder }: { folder: string }): React.JSX.Element {
  return (
    <Text
      selectable={false}
      numberOfLines={1}
      ellipsizeMode="head"
      role="code"
      className="min-w-0 shrink text-muted-foreground web:[direction:rtl] web:text-left"
    >
      {shownFolder(folder)}
    </Text>
  );
}

function FileBaseName({ name }: { name: string }): React.JSX.Element {
  return (
    <Text
      selectable={false}
      numberOfLines={1}
      role="code"
      className="shrink-0 text-foreground"
    >
      {name}
    </Text>
  );
}

function FilePath({ path }: { path: string }): React.JSX.Element {
  const slash = path.lastIndexOf('/');

  return (
    <View className="min-w-0 flex-1 flex-row items-center overflow-hidden">
      <FolderName folder={path.slice(0, slash + 1)} />
      <FileBaseName name={path.slice(slash + 1)} />
    </View>
  );
}

function ToggleLabel({
  path,
  open,
}: {
  path: string;
  open: boolean;
}): React.JSX.Element {
  return (
    <TextClassContext.Provider value="select-none no-underline">
      <DisclosureChevron open={open} />
      <FilePath path={path} />
    </TextClassContext.Provider>
  );
}

function FileHeaderToggle(props: FileHeaderProps): React.JSX.Element {
  return (
    <Pressable
      aria-label={`Diff for ${props.file.path}`}
      aria-expanded={props.open}
      onPress={() => props.onOpenChange(!props.open)}
      role="button"
      className={toggleClassName}
    >
      <ToggleLabel path={props.file.path} open={props.open} />
    </Pressable>
  );
}

interface ChangeCountProps {
  count: number;
  className: string;
  children: ReactNode;
}

function ChangeCount(props: ChangeCountProps): React.JSX.Element | null {
  if (props.count <= 0) return null;

  return (
    <Text
      selectable={false}
      role="badge"
      className={`select-none ${props.className}`}
    >
      {props.children}
    </Text>
  );
}

// The Inspector's file header: folder muted, file name strong, then copy and the change counts.
export function FileHeader(props: FileHeaderProps): React.JSX.Element {
  const { file } = props;

  return (
    <View className="h-9 flex-row items-center gap-2 bg-muted pr-3 pl-2">
      <FileHeaderToggle {...props} />
      <CopyButton value={file.path} label="Copy path" />
      <ChangeCount count={file.added} className="text-success">
        +{file.added}
      </ChangeCount>
      <ChangeCount count={file.removed} className="text-danger">
        {`−${file.removed}`}
      </ChangeCount>
    </View>
  );
}
