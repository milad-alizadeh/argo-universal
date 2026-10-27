import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import type { SelectionBar } from '#kit/selection-mode';
import { toolbarButton, toolbarEntry } from './screen-toolbar-items.ios';

// Select All leads and Done trails, as iOS Mail's edit mode does; the selected Actions sit in the bottom toolbar above the home indicator.
export function SelectionItems({ bar }: { bar: SelectionBar }): ReactElement {
  const entry = toolbarEntry(useNativeTheme().colors.primary);

  return (
    <>
      <Stack.Toolbar placement="left">{selectAll(bar)}</Stack.Toolbar>
      <Stack.Toolbar placement="right">{done(bar)}</Stack.Toolbar>
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Spacer />
        {bar.groups.flatMap((group) => group.actions).map(entry)}
      </Stack.Toolbar>
    </>
  );
}

const selectAll = (bar: SelectionBar): ReactElement =>
  toolbarButton({
    id: 'select-all',
    label: bar.allSelected ? 'Deselect All' : 'Select All',
    onPress: bar.onSelectAll,
  });

const done = (bar: SelectionBar): ReactElement =>
  toolbarButton({ id: 'done', label: 'Done', onPress: bar.onClose });
