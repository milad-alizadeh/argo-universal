import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactElement, ReactNode } from 'react';
import { type GestureResponderEvent, Pressable, Text } from 'react-native';
import { cn } from '#lib/generic/utils';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
import {
  openChange,
  SheetPanel,
  sheetHeightClass,
  type PresentationProps,
} from './sheet-panel';

/*
 * From the medium size class up, a web sheet the app opens itself centres on the window as a modal,
 * on Radix Dialog as the Dialog's own centred card is: Root `open`/`onOpenChange`, Portal, Overlay,
 * Content `onCloseAutoFocus`/`onEscapeKeyDown`/`onPointerDownOutside` and Title.
 */
export function ModalSheet(props: PresentationProps): ReactElement {
  return (
    <RadixDialog.Root open={props.open} onOpenChange={openChange(props)}>
      <RadixDialog.Portal>
        <ModalBackdrop {...props}>
          <ModalContent {...props} />
        </ModalBackdrop>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

const backdropClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-2 web:animate-in web:fade-in-0 web:cursor-default web:*:cursor-auto';

// A press on the bare backdrop closes the modal while it may be dismissed; a press inside bubbles up and does not count.
function ModalBackdrop(
  props: PresentationProps & { children: ReactNode },
): ReactElement {
  return (
    <RadixDialog.Overlay>
      <Pressable className={backdropClass} onPress={backdropPress(props)}>
        {props.children}
      </Pressable>
    </RadixDialog.Overlay>
  );
}

function backdropPress(
  props: PresentationProps,
): (event: GestureResponderEvent) => void {
  const close = openChange(props);

  return (event) => {
    if (event.target === event.currentTarget && props.dismissible !== false)
      close(false);
  };
}

function ModalContent(props: PresentationProps): ReactElement {
  return (
    <RadixDialog.Content
      {...contentHandlers(props)}
      className={modalClass(props)}
    >
      <ModalLabel label={props.label} />
      <CentredOverlayScope>
        <SheetPanel {...props} />
      </CentredOverlayScope>
    </RadixDialog.Content>
  );
}

type ContentHandlers = Pick<
  RadixDialog.DialogContentProps,
  'onCloseAutoFocus' | 'onEscapeKeyDown' | 'onPointerDownOutside'
>;

// Radix closes on Escape unless the event is cancelled; the backdrop's own press decides the rest.
function contentHandlers(props: PresentationProps): ContentHandlers {
  return {
    // Radix calls it once the closed modal has left the tree.
    onCloseAutoFocus: props.stack.reports.closed,
    onEscapeKeyDown: (event) => {
      if (props.dismissible === false) event.preventDefault();
    },
    onPointerDownOutside: (event) => event.preventDefault(),
  };
}

// Names the modal; without a label, a title inside the content names it instead.
function ModalLabel(props: { label?: string }): ReactElement | null {
  if (!props.label) return null;

  return (
    <RadixDialog.Title asChild>
      <Text className="sr-only">{props.label}</Text>
    </RadixDialog.Title>
  );
}

// The drawer's surface and heights, as a card no wider than a form.
function modalClass(props: PresentationProps): string {
  return cn(
    'sheet z-50 flex w-lg flex-col overflow-hidden rounded-sheet bg-content pb-6 shadow-card outline-none dark:border dark:border-border web:animate-in web:fade-in-0 web:zoom-in-95 web:duration-200',
    sheetHeightClass(props),
  );
}
