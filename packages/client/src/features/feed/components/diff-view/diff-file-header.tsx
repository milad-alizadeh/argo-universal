import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { TextClassContext } from '@repo/kit/primitives/content/text';
import { DisclosureChevron } from '@repo/kit/primitives/status/disclosure-chevron';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import type { FileDiff } from '../../view/file-diff';
import { ChangeCounts } from './diff-change-counts';
import { FilePath } from './diff-file-path';
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
    'h-5 min-w-0 flex-1 basis-7 justify-start gap-3 rounded-none p-0 sm:h-5 medium:basis-0 medium:gap-2',
});

function ToggleLabel(props: FileHeaderProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="select-none no-underline">
      <DisclosureChevron open={props.open} />
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

// The Inspector's file header: folder muted, file name strong, then the change counts and the Viewed mark.
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
    <View className="h-10.5 flex-row items-center gap-2 pr-3 pl-2">
      <FileHeaderToggle {...props} />
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
        <View className="min-w-0 flex-1 flex-row gap-1">
          <ChangeCounts file={props.file} />
        </View>
        <ViewedMark {...props} compact />
      </View>
      <View className="h-px bg-border" />
    </View>
  );
}
