import type { ReactElement } from 'react';
import { cn } from '#lib/generic/utils';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
// The dialog's own files, not its index: the Dialog draws its compact sheet with this Sheet.
import { DialogOverlay } from '../dialog/dialog-overlay';
import {
  DialogFrame,
  DialogPortal,
  DialogTitleText,
} from '../dialog/dialog-parts';
import { DialogRoot } from '../dialog/dialog-root';
import {
  openChange,
  SheetPanel,
  sheetHeightClass,
  type PresentationProps,
} from './sheet-panel';

// From the medium size class up, a sheet the app opens itself centres on the window as a modal, drawn from the dialog's parts.
export function ModalSheet(props: PresentationProps): ReactElement {
  return (
    <DialogRoot open={props.open} onOpenChange={openChange(props)}>
      <DialogPortal>
        <DialogOverlay dismissible={props.dismissible}>
          <ModalContent {...props} />
        </DialogOverlay>
      </DialogPortal>
    </DialogRoot>
  );
}

function ModalContent(props: PresentationProps): ReactElement {
  return (
    <DialogFrame
      // Radix calls it once the closed modal has left the tree.
      onCloseAutoFocus={props.stack.reports.closed}
      onEscapeKeyDown={keepOpen(props.dismissible)}
      className={modalClass(props)}
    >
      <ModalLabel label={props.label} />
      <CentredOverlayScope>
        <SheetPanel {...props} />
      </CentredOverlayScope>
    </DialogFrame>
  );
}

// Names the modal; without a label, a title inside the content names it instead.
function ModalLabel(props: { label?: string }): ReactElement | null {
  if (!props.label) return null;

  return <DialogTitleText className="sr-only">{props.label}</DialogTitleText>;
}

// Radix closes a dialog on Escape unless the event is cancelled.
function keepOpen(
  dismissible: boolean | undefined,
): (event: KeyboardEvent) => void {
  return (event) => {
    if (dismissible === false) event.preventDefault();
  };
}

// The drawer's surface and heights, as a card no wider than a form.
function modalClass(props: PresentationProps): string {
  return cn(
    'sheet z-50 flex w-lg flex-col overflow-hidden rounded-sheet bg-content pb-6 shadow-card outline-none dark:border dark:border-border web:animate-in web:fade-in-0 web:zoom-in-95 web:duration-200',
    sheetHeightClass(props),
  );
}
