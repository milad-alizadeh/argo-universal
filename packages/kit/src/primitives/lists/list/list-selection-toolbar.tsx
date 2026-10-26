import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { HeaderActions, type ActionGroup } from '#primitives/actions/action';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import type { ContentSelection } from './list-content-selection';

interface ToolbarProps {
  selection: ContentSelection | null;
  bottom?: boolean;
  groups: ActionGroup[];
}

interface EditingToolbar {
  selection: ContentSelection;
  groups: ActionGroup[];
}

function close(selection: ContentSelection): void {
  selection.change([]);
  selection.setEditing(false);
}

function CloseSelection({ selection }: EditingToolbar): ReactElement | null {
  if (Platform.OS === 'web') return null;

  return (
    <Button
      label={Platform.OS === 'ios' ? 'Done' : 'Close selection'}
      variant="text"
      onPress={() => close(selection)}
    />
  );
}

function SelectAll({
  selection,
}: {
  selection: ContentSelection;
}): ReactElement {
  const deselect = selection.allSelected;

  return (
    <Button
      label={deselect ? 'Deselect All' : 'Select All'}
      variant="text"
      onPress={deselect ? () => selection.change([]) : selection.all}
    />
  );
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
      <Text role="heading" aria-level={2}>
        {selectionTitle(selection)}
      </Text>
    </View>
  );
}

function EditingToolbar(props: EditingToolbar): ReactElement {
  return (
    <View className="flex-row items-center gap-2 px-4 py-2">
      <CloseSelection {...props} />
      <SelectionTitle {...props} />
      <SelectionActions {...props} />
    </View>
  );
}

function BottomToolbar({ groups }: EditingToolbar): ReactElement {
  return (
    <View className="flex-row justify-end border-t border-border px-4 py-2">
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
        onPress={() => selection.setEditing(true)}
      />
    </View>
  );
}

function showsEntry(selection: ContentSelection): boolean {
  return Platform.OS === 'ios' && !selection.editing;
}

function selectionTop(props: EditingToolbar): ReactElement | null {
  const visible =
    Platform.OS === 'web'
      ? props.selection.selected.length > 0
      : props.selection.editing;

  return visible ? <EditingToolbar {...props} /> : null;
}

function topToolbar(props: EditingToolbar): ReactElement | null {
  return showsEntry(props.selection) ? (
    <SelectionEntry {...props} />
  ) : (
    selectionTop(props)
  );
}

function bottomToolbar(props: EditingToolbar): ReactElement | null {
  const visible = Platform.OS === 'ios' && props.selection.editing;

  return visible ? <BottomToolbar {...props} /> : null;
}

export function SelectionToolbar(props: ToolbarProps): ReactElement | null {
  if (!props.selection) return null;
  const editing = { selection: props.selection, groups: props.groups };

  if (!props.bottom) return topToolbar(editing);

  return bottomToolbar(editing);
}

function selectionTitle(selection: ContentSelection): string {
  const label = Platform.OS === 'ios' ? 'Selected' : 'selected';

  return `${selection.selected.length} ${label}`;
}
