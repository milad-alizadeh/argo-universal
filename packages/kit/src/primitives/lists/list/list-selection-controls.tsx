import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Button } from '#primitives/actions/button';
import type { ContentSelection } from './list-content-selection';

export function CloseSelection({
  selection,
}: {
  selection: ContentSelection;
}): ReactElement | null {
  if (Platform.OS === 'web') return null;

  return (
    <Button
      label={Platform.OS === 'ios' ? 'Done' : 'Close selection'}
      variant="text"
      onPress={selection.close}
    />
  );
}

export function SelectAll({
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
