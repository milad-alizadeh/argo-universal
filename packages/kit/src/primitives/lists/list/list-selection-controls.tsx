import type { ReactElement } from 'react';
import type { SelectionBar } from '#kit/list-look';
import { Button } from '#primitives/actions/button';
import type { ContentSelection } from './list-content-selection';

// The web's bar has no close button: clearing the selection hides it.
export function CloseSelection(props: {
  selection: ContentSelection;
  bar: SelectionBar;
}): ReactElement | null {
  if (props.bar === 'selected-rows') return null;

  return (
    <Button
      label={props.bar === 'edit-mode' ? 'Done' : 'Close selection'}
      variant="text"
      onPress={props.selection.close}
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
