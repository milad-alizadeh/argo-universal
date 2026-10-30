import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { PathText } from '@repo/kit/primitives/content/path-text';
import { Text, TextClassContext } from '@repo/kit/primitives/content/text';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import { SizeClass } from '@repo/kit/size-class/size-class';
import * as React from 'react';
import { View } from 'react-native';
import type { FileDiff } from '../../view/file-diff';
import { ChangeCounts } from './diff-change-counts';
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

// A moved file's old path, when the Server reports one that differs from where the file is now.
const movedFrom = (file: FileHeaderProps['file']): string | undefined =>
  file.operation === 'move' && file.oldPath !== file.path
    ? file.oldPath
    : undefined;

function RenamedFrom(props: {
  path: string;
  scroll?: boolean;
}): React.JSX.Element {
  return (
    <>
      <PathText path={props.path} quiet scroll={props.scroll} />
      <Text selectable={false} aria-hidden>
        →
      </Text>
    </>
  );
}

function PathToggle(
  props: FileHeaderProps & { scroll?: boolean },
): React.JSX.Element {
  const toggle = toggleOf(props);
  const oldPath = movedFrom(props.file);

  return props.scroll ? (
    <FileHeaderToggle {...toggle}>
      {oldPath !== undefined && <RenamedFrom path={oldPath} scroll />}
      <PathText path={props.file.path} scroll />
    </FileHeaderToggle>
  ) : (
    <WidePathToggle {...props} />
  );
}

function WidePathToggle(props: FileHeaderProps): React.JSX.Element {
  const [pathCut, setPathCut] = React.useState(false);
  const path = props.file.path;
  const oldPath = movedFrom(props.file);

  return (
    <Tooltip
      label={oldPath === undefined ? path : `${oldPath} → ${path}`}
      active={pathCut}
      frameless
    >
      <FileHeaderToggle {...toggleOf(props)}>
        {oldPath !== undefined && <RenamedFrom path={oldPath} />}
        <PathText path={path} showTooltip={false} onCutChange={setPathCut} />
      </FileHeaderToggle>
    </Tooltip>
  );
}

type RowProps = FileHeaderProps & { compact?: boolean };

/*
 * One row at every width: the path (scrolling sideways on a phone), the counts and the Viewed mark, 16 in from each
 * side. A phone draws the mark as a bare circle; a wider window adds its "Viewed" label and a tooltip.
 */
function FileHeaderRow(props: RowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2 bg-muted px-4 py-2">
      <PathToggle {...props} scroll={props.compact} />
      <ChangeCounts file={props.file} />
      <ViewedMark {...props} compact={props.compact} />
    </View>
  );
}

// The Inspector's file header: the path with its folder muted and its name strong, the counts, the Viewed mark.
export function FileHeader(props: FileHeaderProps): React.JSX.Element {
  const labelled = <FileHeaderRow {...props} />;

  return (
    <SizeClass
      compact={<FileHeaderRow {...props} compact />}
      medium={labelled}
      wide={labelled}
    />
  );
}
