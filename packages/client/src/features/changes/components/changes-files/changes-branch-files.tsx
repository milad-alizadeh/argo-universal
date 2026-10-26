import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import { fileTypeIcon } from '@repo/kit/symbols/file-type-icon';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangeCounts, type FileDiff, ViewedMark } from '#features/feed';
import type { ChangesViewProps } from '../../view/changes-view-props';

type BranchFilesProps = ChangesViewProps & { files: readonly FileDiff[] };

// The pane scrolls, so the list takes the height of all its rows, none of them taller than this, and draws them all.
const rowHeightLimit = 80;

// The branch's changed files as a List: icon, name over folder, then the counts and the Viewed mark.
export function BranchFiles(props: BranchFilesProps): React.JSX.Element {
  return (
    <List
      appearance="plain"
      fit
      maxHeight={props.files.length * rowHeightLimit}
      drawDistance={props.files.length * rowHeightLimit}
      accessibilityLabel="Changed files"
    >
      {props.files.map((file) => (
        <FileRow key={file.path} {...props} file={file} />
      ))}
    </List>
  );
}

function FileRow(
  props: ChangesViewProps & { file: FileDiff },
): React.JSX.Element {
  const { path } = props.file;
  const slash = path.lastIndexOf('/');

  return (
    <ListItem
      {...fileLabels(path, slash)}
      leading={<Icon name={fileTypeIcon(path)} tone="muted" />}
      trailing={<FileRowEnd {...props} />}
      onPress={() => props.onFileSelect?.(path)}
    />
  );
}

// The file's name over its folder; the row is named for the diff it opens.
const fileLabels = (
  path: string,
  slash: number,
): Pick<ListItemProps, 'title' | 'subtitle' | 'accessibilityLabel'> => ({
  title: path.slice(slash + 1),
  subtitle: path.slice(0, slash + 1),
  accessibilityLabel: `Diff for ${path}`,
});

// The line counts, then the Viewed mark, which marks the file without opening it.
function FileRowEnd(
  props: ChangesViewProps & { file: FileDiff },
): React.JSX.Element {
  const { file } = props;

  return (
    <View className="flex-row items-center gap-2">
      <ChangeCounts file={file} />
      <ViewedMark
        viewed={props.viewed.includes(file.path)}
        onViewedChange={(viewed) => props.onViewedChange(file.path, viewed)}
      />
    </View>
  );
}
