import type * as React from 'react';
import { View } from 'react-native';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../overlays/popover/popover';
import { type LinkFields, LinkForm } from './rich-textarea-link-form';

// Where the selection sits inside the field, so the editor opens beside it.
interface LinkEditorPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LinkEditorProps {
  // The selection being linked; the editor is closed without one.
  target?: { fields: LinkFields; placement: LinkEditorPlacement };
  onSave: (fields: LinkFields) => void;
  onClose: () => void;
  // Called once the editor has left, so the field takes focus back.
  onClosed: () => void;
}

const popoverLook = {
  side: 'top',
  align: 'start',
  sideOffset: 8,
  accessibilityLabel: 'Edit link',
  className: 'pointer-events-auto w-80 gap-2 p-3',
} as const;

// The editor opens on the Link field, which ⌘K is pressed to fill.
function focusLinkField(event: Event): void {
  event.preventDefault();
  if (!(event.target instanceof HTMLElement)) return;
  event.target.querySelector<HTMLElement>('input[aria-label="Link"]')?.focus();
}

// Once the editor has left, focus goes back to the field rather than to the hidden anchor.
const focusField =
  (onClosed: () => void) =>
  (event: Event): void => {
    event.preventDefault();
    onClosed();
  };

function LinkPopover(props: LinkEditorProps): React.JSX.Element {
  const { target } = props;
  return (
    <PopoverContent
      {...popoverLook}
      onOpenAutoFocus={focusLinkField}
      onCloseAutoFocus={focusField(props.onClosed)}
    >
      {target ? (
        <LinkForm {...props} initial={target.fields} onCancel={props.onClose} />
      ) : null}
    </PopoverContent>
  );
}

// The ⌘K link editor: Text and Link fields in a popover anchored to the selection.
export function LinkEditor(props: LinkEditorProps): React.JSX.Element {
  return (
    <Popover
      open={props.target !== undefined}
      onOpenChange={(open) => !open && props.onClose()}
      className="pointer-events-none absolute inset-0"
    >
      <PopoverTrigger asChild>
        <View className="absolute" style={props.target?.placement} />
      </PopoverTrigger>
      <LinkPopover {...props} />
    </Popover>
  );
}
