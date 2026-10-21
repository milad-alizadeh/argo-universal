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

function labelledEntry(entry: SceneEntry, props: Props): React.JSX.Element[] {
  if (!entry.label) return [];

  return [
    <View key={entry.address} role="listitem">
      <Pressable {...buttonProps(entry, props)}>
        <Text>{entry.label}</Text>
      </Pressable>
    </View>,
  ];
}

export const CanvasAccessibleList = memo(AccessibleList);

function buttonProps(
  entry: SceneEntry,
  props: Props,
): React.ComponentProps<typeof Pressable> {
  const selected = props.selected === entry.address;

  return {
    accessibilityRole: 'button',
    accessibilityLabel: entry.label,
    accessibilityState: { selected },
    'aria-selected': selected,
    onPress: () => props.onSelect(entry),
  } as const;
}
