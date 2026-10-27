import { useMemo, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import {
  useClaimedSelectionMode,
  useOwnsSelectionHeader,
  type SelectionBar,
  type SelectionMode,
} from '#kit/selection-mode';
import { HeaderActions, type ActionGroup } from '#primitives/actions/action';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import type { ContentSelection } from './list-content-selection';
import { CloseSelection, SelectAll } from './list-selection-controls';

interface ToolbarProps {
  selection: ContentSelection | null;
  bottom?: boolean;
  groups: ActionGroup[];
}

interface EditingToolbar {
  selection: ContentSelection;
  groups: ActionGroup[];
}

function SelectionActions(props: EditingToolbar): ReactElement {
  return Platform.OS === 'ios' ? (
    <SelectAll selection={props.selection} />
  ) : (
    <HeaderActions groups={props.groups} label="Selection Actions" slots={3} />
  );
}

function SelectionTitle({ selection }: EditingToolbar): ReactElement {
  return (
    <View className="flex-1">
      <Text role="title" accessibilityRole="heading" aria-level={1}>
        {selectionTitle(selection)}
      </Text>
    </View>
  );
}

function EditingToolbar(props: EditingToolbar): ReactElement {
  const ios = Platform.OS === 'ios';
  const close = <CloseSelection {...props} />;
  const actions = <SelectionActions {...props} />;

  return (
    <View className="w-full flex-row items-center gap-2 px-4 py-2">
      {ios ? actions : close}
      <SelectionTitle {...props} />
      {ios ? close : actions}
    </View>
  );
}

function BottomToolbar({ groups }: EditingToolbar): ReactElement {
  return (
    <View className="flex-row justify-end px-4 py-2">
      <HeaderActions groups={groups} label="Selection Actions" slots={3} />
    </View>
  );
}

function SelectionEntry({ selection }: EditingToolbar): ReactElement {
  return (
    <View className="px-4 py-2">
      <Button
        label="Select"
        variant="text"
        onPress={() => selection.setSelecting(true)}
      />
    </View>
  );
}

function showsEntry(selection: ContentSelection): boolean {
  return Platform.OS === 'ios' && !selection.selecting;
}

function selectionTop(props: EditingToolbar): ReactElement | null {
  const visible =
    Platform.OS === 'web'
      ? props.selection.selected.length > 0
      : props.selection.selecting;

  return visible ? <EditingToolbar {...props} /> : null;
}

function topToolbar(props: EditingToolbar): ReactElement | null {
  return showsEntry(props.selection) ? (
    <SelectionEntry {...props} />
  ) : (
    selectionTop(props)
  );
}

// A Screen's stack draws the Actions in its own bottom toolbar; only a List with no Screen draws them here.
function BottomSelection(props: EditingToolbar): ReactElement | null {
  const owned = useClaimedSelectionMode()?.bar;

  return owned ? null : <IosBottom {...props} />;
}

function IosBottom(props: EditingToolbar): ReactElement | null {
  const visible = Platform.OS === 'ios' && props.selection.selecting;

  return visible ? <BottomToolbar {...props} /> : null;
}

export function SelectionToolbar(props: ToolbarProps): ReactElement | null {
  if (!props.selection) return null;
  const selecting = { selection: props.selection, groups: props.groups };

  return props.bottom ? (
    <BottomSelection {...selecting} />
  ) : (
    <SelectionHeader {...selecting} />
  );
}

// The List offers its selection mode to the Screen that owns its header; with no Screen, or another List holding it, it draws the toolbar in its own column.
function SelectionHeader(props: EditingToolbar): ReactElement | null {
  const { selection, groups } = props;

  const mode = useMemo(
    () => selectionMode({ selection, groups }),
    [selection, groups],
  );

  const owned = useOwnsSelectionHeader(mode);

  return owned ? null : topToolbar(props);
}

function selectionMode(props: EditingToolbar): SelectionMode {
  const { selection } = props;

  return {
    bar: selectionBar(props),
    header: selectionTop(props),
    begin: showsEntry(selection) ? () => selection.setSelecting(true) : null,
  };
}

function selectionTitle(selection: ContentSelection): string {
  const label = Platform.OS === 'ios' ? 'Selected' : 'selected';

  return `${selection.selected.length} ${label}`;
}

function selectionBar(props: EditingToolbar): SelectionBar | null {
  const { selection } = props;

  return Platform.OS !== 'web' && selection.selecting ? barOf(props) : null;
}

function barOf({ selection, groups }: EditingToolbar): SelectionBar {
  return {
    title: selectionTitle(selection),
    allSelected: selection.allSelected,
    onSelectAll: selection.allSelected
      ? () => selection.change([])
      : selection.all,
    onClose: selection.close,
    groups,
  };
}
