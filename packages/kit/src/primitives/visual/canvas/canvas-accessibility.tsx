import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { SceneEntry } from './canvas-scene-types';

interface Props {
  label: string;
  entries: SceneEntry[];
  selected?: string;
  onSelect: (entry: SceneEntry) => void;
}

interface RowProps {
  entry: SceneEntry;
  label: string;
  selected: boolean;
  onSelect: (entry: SceneEntry) => void;
}

function AccessibleList(props: Props): React.JSX.Element {
  return (
    <View
      role="list"
      accessibilityLabel={`${props.label} shapes`}
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
    >
      {props.entries.flatMap((entry) => labelledEntry(entry, props))}
    </View>
  );
}

/*
 * One row per labelled shape. A scene holds thousands of them, so a row takes the plain values it
 * draws and is memoised: selecting a shape redraws the two rows that changed, not every row.
 */
const AccessibleEntry = memo(function AccessibleEntry(
  props: RowProps,
): React.JSX.Element {
  return (
    <View role="listitem">
      <Pressable {...buttonProps(props)}>
        <Text>{props.label}</Text>
      </Pressable>
    </View>
  );
});

function labelledEntry(entry: SceneEntry, props: Props): React.JSX.Element[] {
  if (!entry.label) return [];

  const row = {
    entry,
    label: entry.label,
    selected: props.selected === entry.address,
    onSelect: props.onSelect,
  };

  return [<AccessibleEntry key={entry.address} {...row} />];
}

function buttonProps({
  entry,
  label,
  selected,
  onSelect,
}: RowProps): React.ComponentProps<typeof Pressable> {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityState: { selected },
    'aria-selected': selected,
    onPress: () => onSelect(entry),
  } as const;
}

export const CanvasAccessibleList = memo(AccessibleList);
