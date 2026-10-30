import type { ReactElement } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { isDismissible } from './sheet-dismissible';
import { openChange, SheetPanel, type PresentationProps } from './sheet-panel';

// A wide window opens the sheet as a popover on its trigger.
export function PopoverSheet(props: PresentationProps): ReactElement {
  return (
    <Popover open={props.open} onOpenChange={popoverChange(props)}>
      <PopoverSheetTrigger trigger={props.trigger} />
      <PopoverSheetContent {...props} />
    </Popover>
  );
}

function PopoverSheetContent(props: PresentationProps): ReactElement {
  return (
    <PopoverContent
      side="top"
      align="start"
      accessibilityLabel={props.label}
      onClosed={props.stack.reports.closed}
      list
    >
      <SheetPanel {...props} hideRootTitle />
    </PopoverContent>
  );
}

function PopoverSheetTrigger(
  props: Pick<PresentationProps, 'trigger'>,
): ReactElement {
  return (
    <PopoverTrigger disabled={!!props.trigger?.props.disabled}>
      {props.trigger}
    </PopoverTrigger>
  );
}

// Escape and a press outside close the popover only while the sheet may be dismissed.
function popoverChange(props: PresentationProps): (open: boolean) => void {
  const change = openChange(props);

  return (open) => {
    if (open || isDismissible(props.dismissible)) change(open);
  };
}
