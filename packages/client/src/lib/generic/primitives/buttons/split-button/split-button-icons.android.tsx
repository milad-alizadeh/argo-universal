import { DropdownMenuItem, Icon, RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import expandMore from '../../../symbols/assets/expand-more.xml';

// A native Compose icon at the control role's size, so the whole stock button takes the tap; it inherits the button's content colour.
export function ChevronIcon(): React.JSX.Element {
  return <Icon source={expandMore} />;
}

// The chosen item's trailing check.
export function ItemCheck(): React.JSX.Element {
  return (
    <DropdownMenuItem.TrailingIcon>
      <RNHostView matchContents>
        <SelectedCheck />
      </RNHostView>
    </DropdownMenuItem.TrailingIcon>
  );
}
