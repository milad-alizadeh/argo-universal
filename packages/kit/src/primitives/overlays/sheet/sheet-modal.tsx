import type { ReactElement } from 'react';
import { cn } from '#kit/utils';
import {
  CentredModal,
  CentredModalRoot,
  CentredModalTrigger,
} from '#primitives/overlays/centred-overlay';
import {
  openChange,
  SheetPanel,
  sheetHeightClass,
  type PresentationProps,
} from './sheet-panel';

/*
 * From the medium size class up, and below wide for a sheet with a trigger, a web sheet centres on the
 * window as a modal, as the Dialog's own centred card does. Opening asks the owner; closing reports a dismissal.
 */
export function ModalSheet(props: PresentationProps): ReactElement {
  return (
    <CentredModalRoot open={props.open} onOpenChange={openChange(props)}>
      <CentredModalTrigger>{props.trigger}</CentredModalTrigger>
      <CentredModal
        label={props.label}
        dismissible={props.dismissible}
        // Radix calls it once the closed modal has left the tree.
        onCloseAutoFocus={props.stack.reports.closed}
        className={modalClass(props)}
      >
        <SheetPanel {...props} />
      </CentredModal>
    </CentredModalRoot>
  );
}

// The drawer's surface and heights, as a card no wider than a form, or as the wider card a two-column page asks for.
function modalClass(props: PresentationProps): string {
  return cn(
    'sheet z-50 flex flex-col overflow-hidden rounded-sheet bg-content pb-6 shadow-card outline-none dark:border dark:border-border web:animate-in web:fade-in-0 web:zoom-in-95 web:duration-200',
    props.wide ? 'sheet-wide' : 'w-lg',
    sheetHeightClass(props),
  );
}
