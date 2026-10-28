import { useMemo, type ReactElement } from 'react';
import { View } from 'react-native';
import type { SelectionBar } from '#kit/list-look';
import { useListLook } from '#kit/list-look-context';
import {
  useOwnsSelectionHeader,
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
  bar: SelectionBar;
}

const editMode = ({ bar }: EditingToolbar): boolean => bar === 'edit-mode';

function SelectionActions(props: EditingToolbar): ReactElement {
  return editMode(props) ? (
    <SelectAll selection={props.selection} />
  ) : (
    <HeaderActions groups={props.groups} label="Selection Actions" slots={3} />
  );
}

function SelectionTitle(props: EditingToolbar): ReactElement {
  const { selection } = props;

  return (
    <View className="flex-1">
      <Text role="title" accessibilityRole="heading" aria-level={1}>
        {selectionTitle(selection, props.bar)}
      </Text>
    </View>
  );
}

function EditingToolbar(props: EditingToolbar): ReactElement {
  const ios = editMode(props);
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

function showsEntry(props: EditingToolbar): boolean {
  return editMode(props) && !props.selection.selecting;
}

function selectionTop(props: EditingToolbar): ReactElement | null {
  const visible =
    props.bar === 'selected-rows'
      ? props.selection.selected.length > 0
      : props.selection.selecting;

  return visible ? <EditingToolbar {...props} /> : null;
}

function topToolbar(props: EditingToolbar): ReactElement | null {
  return showsEntry(props) ? (
    <SelectionEntry {...props} />
  ) : (
    selectionTop(props)
  );
}

function bottomToolbar(props: EditingToolbar): ReactElement | null {
  const visible = editMode(props) && props.selection.selecting;

  return visible ? <BottomToolbar {...props} /> : null;
}

export function SelectionToolbar(props: ToolbarProps): ReactElement | null {
  const bar = useListLook().selectionBar;

  if (!props.selection) return null;
  const selecting = { selection: props.selection, groups: props.groups, bar };

  return props.bottom ? (
    bottomToolbar(selecting)
  ) : (
    <SelectionHeader {...selecting} />
  );
}

// The List offers its selection mode to the Screen that owns its header; with no Screen, or another List holding it, it draws the toolbar in its own column.
function SelectionHeader(props: EditingToolbar): ReactElement | null {
  const { selection, groups, bar } = props;

  const mode = useMemo(
    () => selectionMode({ selection, groups, bar }),
    [selection, groups, bar],
  );

  const owned = useOwnsSelectionHeader(mode);

  return owned ? null : topToolbar(props);
}

function selectionMode(props: EditingToolbar): SelectionMode {
  const { selection } = props;

  return {
    header: selectionTop(props),
    begin: showsEntry(props) ? () => selection.setSelecting(true) : null,
  };
}

function selectionTitle(
  selection: ContentSelection,
  bar: SelectionBar,
): string {
  const label = bar === 'edit-mode' ? 'Selected' : 'selected';

  return `${selection.selected.length} ${label}`;
}
