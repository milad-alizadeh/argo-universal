import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { IconRole } from '#lib/generic/symbols/icon-role';
import { CopyButton } from '#lib/product/markdown/copy-button';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text, TextClassContext } from '#primitives/content/text';
import { Checkbox } from '#primitives/inputs/checkbox';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { FileDiff } from '../../view/file-diff';
import { ChangeCounts, hasChangeCounts } from './diff-change-counts';

export interface FileHeaderProps {
  file: FileDiff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

// The phone header's chevron sits one size down from the Body chevron, beside the path's smaller code text.
type FileHeaderToggleProps = FileHeaderProps & { chevron?: IconRole };

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

function ToggleLabel(props: FileHeaderToggleProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="select-none no-underline">
      <DisclosureChevron open={props.open} role={props.chevron} />
      <FilePath path={props.file.path} />
    </TextClassContext.Provider>
  );
}

function FileHeaderToggle(props: FileHeaderToggleProps): React.JSX.Element {
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

function ViewedMark(props: FileHeaderProps): React.JSX.Element | null {
  if (!props.onViewedChange) return null;

  return (
    <Checkbox
      label="Viewed"
      variant="inline"
      value={props.viewed ?? false}
      onValueChange={props.onViewedChange}
    />
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

// On a phone the path keeps the whole first line, the counts sit under it, and there is no copy.
function CompactFileHeader(props: FileHeaderProps): React.JSX.Element {
  return (
    <View className="gap-0.5 bg-muted py-2 pr-3 pl-2">
      <View className="min-h-5 flex-row items-center gap-2">
        <FileHeaderToggle {...props} chevron="secondary" />
        <ViewedMark {...props} />
      </View>
      {hasChangeCounts(props.file) && (
        <View className="flex-row gap-2 pl-6">
          <ChangeCounts file={props.file} />
        </View>
      )}
    </View>
  );
}
