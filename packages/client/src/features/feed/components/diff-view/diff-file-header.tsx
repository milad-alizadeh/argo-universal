import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { TextClassContext } from '@repo/kit/primitives/content/text';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import type { FileDiff } from '../../view/file-diff';
import { ChangeCounts } from './diff-change-counts';
import { FilePath, ScrollingFilePath } from './diff-file-path';
import { ViewedMark } from './diff-viewed-mark';

export interface FileHeaderProps {
  // The header needs the file's path and counts, not its hunks, which may not have loaded.
  file: Omit<FileDiff, 'hunks'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

const toggleClassName = contentActionClass({
  variant: 'link',
  className: 'h-6 min-w-0 flex-1 justify-start gap-2 rounded-none p-0 sm:h-6',
});

// A tooltip around the toggle hands it the press and hover handlers it opens and closes by.
type ToggleProps = React.ComponentProps<typeof Pressable> & {
  open: boolean;
  children: React.ReactNode;
};

// The chevron's glyph is a narrow mark in a wider box, so it takes only the mark's width beside the path.
function ToggleLabel(
  props: Pick<ToggleProps, 'open' | 'children'>,
): React.JSX.Element {
  return (
    <TextClassContext.Provider value="select-none no-underline">
      <View className="h-6 w-3 items-center justify-center">
        <Chevron direction="right" open={props.open} />
      </View>
      {props.children}
    </TextClassContext.Provider>
  );
}

function FileHeaderToggle({
  open,
  children,
  ...press
}: ToggleProps): React.JSX.Element {
  return (
    <Pressable {...press} role="button" className={toggleClassName}>
      <ToggleLabel open={open}>{children}</ToggleLabel>
    </Pressable>
  );
}

const toggleOf = (props: FileHeaderProps): Omit<ToggleProps, 'children'> => ({
  open: props.open,
  'aria-label': `Diff for ${props.file.path}`,
  'aria-expanded': props.open,
  onPress: () => props.onOpenChange(!props.open),
});

// Desktop: a path the row cuts short shows whole in a tooltip.
function TruncatingToggle(props: FileHeaderProps): React.JSX.Element {
  const [cutShort, setCutShort] = useState(false);

  const toggle = (
    <FileHeaderToggle {...toggleOf(props)}>
      <FilePath path={props.file.path} onCutShortChange={setCutShort} />
    </FileHeaderToggle>
  );

  // A column, so the tooltip's own wrapper takes the row's width rather than the path's.
  return (
    <View className="min-w-0 flex-1">
      {cutShort ? <Tooltip label={props.file.path}>{toggle}</Tooltip> : toggle}
    </View>
  );
}

// The Inspector's file header, one line: the path with its folder muted and its name strong, the counts, the Viewed mark.
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
    <View className="h-10.5 flex-row items-center gap-2 bg-content">
      <TruncatingToggle {...props} />
      <ChangeCounts file={props.file} />
      <ViewedMark {...props} />
    </View>
  );
}

// The phone draws one row: counts beside the path and a circular Viewed mark.
function CompactFileHeader(props: FileHeaderProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2 bg-card py-2.5">
      <FileHeaderToggle {...toggleOf(props)}>
        <ScrollingFilePath path={props.file.path} />
      </FileHeaderToggle>
      <View className="flex-row gap-1">
        <ChangeCounts file={props.file} />
      </View>
      <ViewedMark {...props} compact />
    </View>
  );
}
