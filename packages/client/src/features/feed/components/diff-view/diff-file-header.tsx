import type * as React from 'react';
import { Platform, View } from 'react-native';
import { CopyButton } from '#lib/product/markdown/copy-button';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text, TextClassContext } from '#primitives/content/text';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { FileDiff } from '../../view/file-diff';
import { ChangeCounts } from './diff-change-counts';
import { ViewedMark } from './diff-viewed-mark';

export interface FileHeaderProps {
  file: FileDiff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

const toggleClassName = contentActionClass({
  variant: 'link',
  className:
    'h-5 min-w-0 flex-1 justify-start gap-3 rounded-none p-0 sm:h-5 medium:gap-2',
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

function ToggleLabel(props: FileHeaderProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="select-none no-underline">
      <DisclosureChevron open={props.open} role="chevron" />
      <FilePath path={props.file.path} />
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
      <ToggleLabel {...props} />
    </Pressable>
  );
}

// The Inspector's file header: folder muted, file name strong, then copy, the change counts and the Viewed mark.
export function FileHeader(props: FileHeaderProps): React.JSX.Element {
  const full = <FullFileHeader {...props} />;

  return (
    <SizeClass
      compact={<CompactFileHeader {...props} />}
      medium={full}
      wide={full}
    />
  );
}

function FullFileHeader(props: FileHeaderProps): React.JSX.Element {
  return (
    <View className="h-9 flex-row items-center gap-2 bg-muted pr-3 pl-2">
      <FileHeaderToggle {...props} />
      <CopyButton value={props.file.path} label="Copy path" />
      <ChangeCounts file={props.file} />
      <ViewedMark {...props} />
    </View>
  );
}

// Paper / FileDiff: one phone row, with counts beside the path and a circular Viewed mark.
function CompactFileHeader(props: FileHeaderProps): React.JSX.Element {
  return (
    <View className="bg-card">
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <FileHeaderToggle {...props} />
        <View className="shrink-0 flex-row gap-1">
          <ChangeCounts file={props.file} />
        </View>
        <ViewedMark {...props} compact />
      </View>
      <View className="mr-4 ml-10 h-px bg-border" />
    </View>
  );
}
