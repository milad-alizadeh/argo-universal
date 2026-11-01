import { BottomSheet, Group, Popover, RNHostView } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  interactiveDismissDisabled,
  preferredColorScheme,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { CompactScope } from '../../../use-size-class/compact-scope';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { useClosedAfterOpen } from './sheet-closed-after-open';
import { isDismissible } from './sheet-dismissible';
import { SheetFrame } from './sheet-frame.ios';
import type { SheetDetent, SheetProps } from './sheet-props';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetScreen,
  useSheetStack,
  type SheetStack,
} from './sheet-screens';
import { SheetScreens } from './sheet-stack.ios';
import { sheetDetents } from './sheet-state';
import { SheetTrigger } from './sheet-trigger';

type PresentationProps = SheetProps & { stack: SheetStack };

/*
 * SwiftUI's sheet, its pages a NavigationStack that pushes with the system slide. A wide iPad
 * opens a sheet that has a trigger as a popover on it instead, holding the same stack; a medium
 * iPad keeps the system sheet (#927).
 */
function SheetRoot(props: SheetProps): ReactElement {
  const stack = useSheetStack(props);
  const { popover, Presentation } = usePresentation(props);

  return (
    <SheetNavigationProvider value={stack.navigation}>
      <SheetFrame {...props} popover={popover}>
        <Presentation {...props} stack={stack} />
      </SheetFrame>
    </SheetNavigationProvider>
  );
}

// Where the sheet draws: a popover on its trigger on a wide iPad, the system sheet elsewhere.
type SheetPresentation = {
  popover: boolean;
  Presentation: (props: PresentationProps) => ReactElement;
};

function usePresentation(props: SheetProps): SheetPresentation {
  const popover = useSizeClass() === 'wide' && props.trigger !== undefined;

  return { popover, Presentation: popover ? PopoverSheet : SystemSheet };
}

/*
 * The trigger stays in React Native layout, as on Android, rather than in the sheet's anchor: an
 * anchor is hosted at its content's size, so a field that fills its row had no width to fill.
 * What a system sheet holds draws as on a phone at every Size class, as Paper's iPad sheets do.
 */
function SystemSheet(props: PresentationProps): ReactElement {
  return (
    <BottomSheet
      isPresented={props.open}
      onIsPresentedChange={presentedChange(props)}
      onDismiss={props.stack.reports.closed}
      fitToContents={detentsOf(props) === undefined}
    >
      <SystemSheetScreens {...props} />
    </BottomSheet>
  );
}

function SystemSheetScreens(props: PresentationProps): ReactElement {
  return (
    <Group modifiers={useSheetModifiers(props)}>
      <CompactScope>
        <SheetScreens {...props} />
      </CompactScope>
    </Group>
  );
}

function PopoverSheet(props: PresentationProps): ReactElement {
  useClosedAfterOpen(props);

  return <PopoverPresentation {...props} />;
}

function PopoverPresentation(props: PresentationProps): ReactElement {
  return (
    <Popover
      isPresented={props.open}
      onIsPresentedChange={presentedChange(props)}
    >
      <Popover.Trigger>
        <HostedTrigger {...props} />
      </Popover.Trigger>
      <Popover.Content>
        <PopoverScreens {...props} />
      </Popover.Content>
    </Popover>
  );
}

function PopoverScreens(props: PresentationProps): ReactElement {
  return (
    <Group
      modifiers={[
        interactiveDismissDisabled(!isDismissible(props.dismissible)),
      ]}
    >
      <CompactScope>
        <SheetScreens {...props} popoverWidth={popoverWidth} />
      </CompactScope>
    </Group>
  );
}

/*
 * UIKit's default popover width (UIViewController.preferredContentSize): a popover has no width of
 * its own to fill, and its content is compact, as UIKit gives a popover a compact size class.
 */
const popoverWidth = 320;

function presentedChange(props: PresentationProps): (open: boolean) => void {
  return (open) => {
    if (open) props.onOpenChange(true);
    else props.stack.reports.dismissed();
  };
}

// A popover anchors on SwiftUI content, so there the trigger is hosted at its own size.
function HostedTrigger(props: SheetProps): ReactElement {
  return (
    <RNHostView matchContents>
      <SheetTrigger {...props} />
    </RNHostView>
  );
}

function detentsOf(props: PresentationProps): SheetProps['detents'] {
  return sheetDetents({
    detents: props.detents,
    paged: props.stack.paged,
  });
}

// Keep the system grabber and navigation, with one content surface through the safe areas.
function useSheetModifiers(props: PresentationProps): ModifierConfig[] {
  const { colorScheme, colors } = useNativeTheme();
  const detents = detentsOf(props);

  return [
    ...(detents ? [detentsModifier(detents, props.initialDetent)] : []),
    ...(colors.content ? [presentationBackground(colors.content)] : []),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(!isDismissible(props.dismissible)),
    preferredColorScheme(colorScheme),
  ];
}

/*
 * presentationModifiers.d.ts: `presentationDetents(detents, { selection })` opens at `selection`
 * and leaves the person free to drag to another detent; without one it opens at the first.
 */
function detentsModifier(
  detents: SheetDetent[],
  initialDetent: SheetDetent | undefined,
): ModifierConfig {
  return initialDetent
    ? presentationDetents(detents, { selection: initialDetent })
    : presentationDetents(detents);
}

export const Sheet = Object.assign(SheetRoot, {
  Screen: SheetScreen,
  Link: SheetLink,
});
