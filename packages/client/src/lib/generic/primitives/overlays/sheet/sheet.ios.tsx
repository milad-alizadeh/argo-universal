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
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { SizedToContent } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import { CompactScope } from '../../../use-size-class/compact-scope';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetPage,
  useSheetStack,
  type SheetStack,
} from './sheet-pages';
import type { SheetDetent, SheetProps } from './sheet-props';
import { SheetPages } from './sheet-stack.ios';
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
      <View style={props.style} className="min-w-0 shrink">
        {!popover && <SheetTrigger {...props} />}
        <Host matchContents>
          <Presentation {...props} stack={stack} />
        </Host>
      </View>
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
      <SystemSheetPages {...props} />
    </BottomSheet>
  );
}

function SystemSheetPages(props: PresentationProps): ReactElement {
  return (
    <Group modifiers={useSheetModifiers(props)}>
      <CompactScope>
        <SheetPages {...props} />
      </CompactScope>
    </Group>
  );
}

function PopoverSheet(props: PresentationProps): ReactElement {
  return (
    <Popover
      isPresented={props.open}
      onIsPresentedChange={presentedChange(props)}
    >
      <Popover.Trigger>
        <HostedTrigger {...props} />
      </Popover.Trigger>
      <Popover.Content>
        <PopoverPages {...props} />
      </Popover.Content>
    </Popover>
  );
}

function PopoverPages(props: PresentationProps): ReactElement {
  return (
    <Group
      modifiers={[interactiveDismissDisabled(props.dismissible === false)]}
    >
      <SizedToContent.Provider value>
        <CompactScope>
          <SheetPages {...props} popoverWidth={popoverWidth} />
        </CompactScope>
      </SizedToContent.Provider>
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
    paged: props.stack.pages.length > 0,
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
    interactiveDismissDisabled(props.dismissible === false),
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
  Page: SheetPage,
  Link: SheetLink,
});
