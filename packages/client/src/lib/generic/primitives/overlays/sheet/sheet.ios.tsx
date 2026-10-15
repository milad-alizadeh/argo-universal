import { BottomSheet, Group, Popover, RNHostView } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  interactiveDismissDisabled,
  preferredColorScheme,
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
  const Presentation = useWide() && props.trigger ? PopoverSheet : SystemSheet;

  return (
    <SheetNavigationProvider value={stack.navigation}>
      <View style={props.style} className="min-w-0 shrink">
        <Host matchContents>
          <Presentation {...props} stack={stack} />
        </Host>
      </View>
    </SheetNavigationProvider>
  );
}

function SystemSheet(props: PresentationProps): ReactElement {
  return (
    <BottomSheet
      isPresented={props.open}
      onIsPresentedChange={presentedChange(props)}
      onDismiss={props.stack.reports.closed}
      fitToContents={detentsOf(props) === undefined}
      anchor={props.trigger ? <SheetTrigger {...props} /> : undefined}
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
        <SheetTrigger {...props} />
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

function SheetTrigger(props: PresentationProps): ReactElement | null {
  if (!props.trigger) return null;

  return (
    <RNHostView matchContents>
      {cloneElement(props.trigger, { onPress: () => props.onOpenChange(true) })}
    </RNHostView>
  );
}

function detentsOf(props: PresentationProps): SheetProps['detents'] {
  return sheetDetents({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });
}

// The system's own glass and grabber; Argo's Appearance picks the presentation's light or dark.
function useSheetModifiers(props: PresentationProps): ModifierConfig[] {
  const { colorScheme } = useNativeTheme();
  const detents = detentsOf(props);

  return [
    ...(detents ? [presentationDetents(detents)] : []),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
    preferredColorScheme(colorScheme),
  ];
}

export const Sheet = Object.assign(SheetRoot, {
  Page: SheetPage,
  Link: SheetLink,
});
