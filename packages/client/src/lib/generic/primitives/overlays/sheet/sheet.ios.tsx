import { BottomSheet, Group, Popover, RNHostView } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  interactiveDismissDisabled,
  preferredColorScheme,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { cloneElement, type ReactElement } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetPage,
  useSheetStack,
  type SheetStack,
} from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { SheetPages } from './sheet-stack.ios';
import { sheetDetents } from './sheet-state';

type PresentationProps = SheetProps & { stack: SheetStack };

/*
 * SwiftUI's sheet, its pages a NavigationStack that pushes with the system slide. A wide iPad
 * opens a sheet that has a trigger as a popover on it instead, holding the same stack.
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
  const popover = useWide() && props.trigger !== undefined;

  return { popover, Presentation: popover ? PopoverSheet : SystemSheet };
}

/*
 * The trigger stays in React Native layout, as on Android, rather than in the sheet's anchor: an
 * anchor is hosted at its content's size, so a field that fills its row had no width to fill.
 */
function SystemSheet(props: PresentationProps): ReactElement {
  return (
    <BottomSheet
      isPresented={props.open}
      onIsPresentedChange={presentedChange(props)}
      onDismiss={props.stack.reports.closed}
      fitToContents={detentsOf(props) === undefined}
    >
      <Group modifiers={useSheetModifiers(props)}>
        <SheetPages {...props} />
      </Group>
    </BottomSheet>
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
      <SheetPages {...props} />
    </Group>
  );
}

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

function SheetTrigger(props: SheetProps): ReactElement | null {
  if (!props.trigger) return null;

  return cloneElement(props.trigger, {
    onPress: () => props.onOpenChange(true),
  });
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
    ...(detents ? [presentationDetents(detents)] : []),
    ...(colors.content ? [presentationBackground(colors.content)] : []),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
    preferredColorScheme(colorScheme),
  ];
}

export const Sheet = Object.assign(SheetRoot, {
  Page: SheetPage,
  Link: SheetLink,
});
