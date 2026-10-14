import type * as React from 'react';
import { View } from 'react-native';
import {
  Popover,
  PopoverTrigger,
} from '#primitives/overlays/popover/popover-view';
import type { FieldPlacement } from './web/rich-textarea-placement';

interface SelectionPopoverProps {
  // Where the selection sits; the popover is closed without one.
  placement?: FieldPlacement;
  onClose: () => void;
  // The PopoverContent shown beside the selection.
  children: React.ReactNode;
}

const overField = 'pointer-events-none absolute inset-0';

function SelectionAnchor({
  placement,
}: Pick<SelectionPopoverProps, 'placement'>): React.JSX.Element {
  // Only anchors the popover, so Tab skips it.
  return (
    <PopoverTrigger asChild>
      <View className="absolute" style={placement} tabIndex={-1} />
    </PopoverTrigger>
  );
}

// A popover anchored to the selection inside the field, as the link editor and the format bar are.
export function SelectionPopover(
  props: SelectionPopoverProps,
): React.JSX.Element {
  return (
    <Popover
      open={props.placement !== undefined}
      onOpenChange={(open) => !open && props.onClose()}
      className={overField}
    >
      <SelectionAnchor placement={props.placement} />
      {props.children}
    </Popover>
  );
}
