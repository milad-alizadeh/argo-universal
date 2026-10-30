import { cloneElement, type ReactElement, type Ref } from 'react';
import { View } from 'react-native';
import { Drawer } from 'vaul';
import { cn } from '#kit/utils';
import { useCentresOverlays } from '#primitives/overlays/centred-overlay';
import { useWide } from '../../../use-wide/use-wide';
import { isDismissible } from './sheet-dismissible';
import { ModalSheet } from './sheet-modal';
import {
  openChange,
  SheetPanel,
  sheetHeightClass,
  type PresentationProps,
} from './sheet-panel';
import { PopoverSheet } from './sheet-popover';
import type { SheetProps } from './sheet-props';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetScreen,
  useSheetStack,
} from './sheet-screens';

/*
 * A compact window raises the sheet from the bottom edge as a drawer; a wide one opens a sheet
 * with a trigger as a popover on it. Otherwise the sheet centres as a modal from the medium size
 * class up.
 */
function SheetRoot(props: SheetProps): ReactElement {
  const stack = useSheetStack(props);

  return (
    <SheetNavigationProvider value={stack.navigation}>
      <View style={props.style} className="min-w-0 shrink">
        <SheetPresentation {...props} stack={stack} />
      </View>
    </SheetNavigationProvider>
  );
}

function SheetPresentation(props: PresentationProps): ReactElement {
  const presentation = usePresentation(props);

  if (presentation === 'popover') return <PopoverSheet {...props} />;

  if (presentation === 'drawer') return <DrawerSheet {...props} />;

  return <ModalSheet {...props} />;
}

type Presentation = 'drawer' | 'modal' | 'popover';

// A sheet kept to the bottom edge stays a drawer; otherwise a popover on its trigger when wide, a modal from medium up, and a drawer below.
function usePresentation(props: SheetProps): Presentation {
  const wide = useWide();
  const centred = useCentresOverlays();

  if (props.bottomEdge) return 'drawer';

  return liftedPresentation(props.trigger !== undefined && wide, centred);
}

function liftedPresentation(popover: boolean, centred: boolean): Presentation {
  if (popover) return 'popover';

  return centred ? 'modal' : 'drawer';
}

function DrawerSheet(props: PresentationProps): ReactElement {
  return (
    <Drawer.Root {...drawerProps(props)}>
      <DrawerTrigger {...props} />
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim/20" />
        <DrawerContent {...props} />
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// The portal's presence measures the content through this ref to wait for its closing slide.
function DrawerContent({
  ref,
  ...props
}: PresentationProps & { ref?: Ref<HTMLDivElement> }): ReactElement {
  return (
    <Drawer.Content
      ref={ref}
      aria-describedby={undefined}
      // Radix calls it once the closed drawer has left the tree, after its slide.
      onCloseAutoFocus={props.stack.reports.closed}
      className={drawerClass(props)}
    >
      <DrawerInner {...props} />
    </Drawer.Content>
  );
}

function DrawerInner(props: PresentationProps): ReactElement {
  return (
    <>
      <SheetLabel label={props.label} />
      <Drawer.Handle />
      <SheetPanel {...props} />
    </>
  );
}

// Names the drawer; without a label, a title inside the content, such as a dialog's, names it instead.
function SheetLabel(props: { label?: string }): ReactElement | null {
  if (!props.label) return null;

  // A span, not a heading: the page draws its own heading, and the label only names the drawer.
  return (
    <Drawer.Title asChild>
      <span className="sr-only">{props.label}</span>
    </Drawer.Title>
  );
}

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible: boolean;
}

function drawerProps(props: PresentationProps): DrawerProps {
  return {
    open: props.open,
    onOpenChange: openChange(props),
    dismissible: isDismissible(props.dismissible),
  };
}

// A sheet that rests only at its full height fills the window; any other is as tall as its content, so `initialDetent` is ignored.
function drawerClass(props: PresentationProps): string {
  return cn(
    'sheet overflow-hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-sheet bg-content pb-6 shadow-card outline-none dark:border dark:border-border',
    sheetHeightClass(props),
    props.bottomEdge && 'sheet-edge',
    props.floating && 'sheet-floating',
  );
}

// The drawer's own trigger, as the kit popover's: Radix records it to take focus back on close; the press opens the sheet.
function DrawerTrigger(props: TriggerProps): ReactElement | null {
  if (!props.trigger) return null;

  return (
    <Drawer.Trigger asChild disabled={!!props.trigger.props.disabled}>
      {cloneElement(props.trigger, {
        onPress: () => props.onOpenChange(true),
      })}
    </Drawer.Trigger>
  );
}

type TriggerProps = Pick<SheetProps, 'trigger' | 'onOpenChange'>;

export const Sheet = Object.assign(SheetRoot, {
  Screen: SheetScreen,
  Link: SheetLink,
});
