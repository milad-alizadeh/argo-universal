// iOS only: the searchable page needs SwiftUI's NavigationStack, which no universal component offers.
import {
  BottomSheet,
  Group,
  NavigationDestination,
  NavigationStack,
  RNHostView,
  Text,
} from '@expo/ui/swift-ui';
import {
  navigationBarTitleDisplayMode,
  navigationTitle,
  presentationDetents,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import {
  RoutedFormSheet,
  useFormSheetCommands,
} from '#primitives/overlays/bottom-sheet';
import type { PickerProps } from './picker-props';
import { PickerSearchList } from './picker-search-list';

type SheetProps<Value extends string> = PickerProps<Value> & {
  open: boolean;
  onClose: () => void;
};

const destination = 'picker-options';

export function PickerDrillInSheet<Value extends string>(
  props: SheetProps<Value>,
): React.JSX.Element {
  const commands = useFormSheetCommands();

  if (commands)
    return (
      <RoutedFormSheet {...routedProps(props)} commands={commands}>
        <PickerSearchList {...props} />
      </RoutedFormSheet>
    );

  return <StandaloneSheet {...props} />;
}

// The SwiftUI sheet sits inside the Picker's Host, so it keeps Argo's Appearance; the universal one brings its own Host.
function StandaloneSheet<Value extends string>(
  props: SheetProps<Value>,
): React.JSX.Element {
  return (
    <BottomSheet {...sheetProps(props)}>
      <Group modifiers={[presentationDetents(['large'])]}>
        {props.open && <PickerNavigation {...props} />}
      </Group>
    </BottomSheet>
  );
}

function sheetProps(props: {
  open: boolean;
  onClose: () => void;
}): Omit<React.ComponentProps<typeof BottomSheet>, 'children'> {
  return {
    isPresented: props.open,
    onIsPresentedChange: (open) => {
      if (!open) props.onClose();
    },
  };
}

function PickerNavigation<Value extends string>(
  props: SheetProps<Value>,
): React.JSX.Element {
  return (
    <NavigationStack {...usePickerPath(props.onClose)}>
      <Text modifiers={[navigationTitle('Back')]}>{props.label}</Text>
      <NavigationDestination value={destination}>
        <PickerDestination {...props} />
      </NavigationDestination>
    </NavigationStack>
  );
}

function PickerDestination<Value extends string>(
  props: SheetProps<Value>,
): React.JSX.Element {
  return (
    <Group modifiers={destinationModifiers(props.label)}>
      <RNHostView>
        <PickerSearchList {...props} />
      </RNHostView>
    </Group>
  );
}

function destinationModifiers(
  label: string,
): ReturnType<typeof navigationTitle>[] {
  return [navigationTitle(label), navigationBarTitleDisplayMode('inline')];
}

function usePickerPath(
  close: () => void,
): Omit<React.ComponentProps<typeof NavigationStack>, 'children'> {
  const [path, setPath] = useState([destination]);

  return {
    path,
    onPathChange: (next) => {
      setPath(next);

      if (next.length === 0) close();
    },
  };
}

function routedProps<Value extends string>(
  props: SheetProps<Value>,
): Omit<React.ComponentProps<typeof RoutedFormSheet>, 'commands' | 'children'> {
  return {
    open: props.open,
    label: props.label,
    headerTitle: props.label,
    onOpenChange: (open): void => {
      if (!open) props.onClose();
    },
  };
}
