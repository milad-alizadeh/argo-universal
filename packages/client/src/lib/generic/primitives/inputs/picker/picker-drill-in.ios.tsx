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
  presentationBackground,
  presentationDetents,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { groupedBackground } from '#primitives/native/grouped-background';
import { RoutedFormSheet } from '#primitives/overlays/bottom-sheet';
import { useFormSheetCommands } from '#primitives/overlays/bottom-sheet';
import type { PickerProps } from './picker-props';
import { PickerSearchPage } from './picker-search-page';

type DrillProps<Value extends string> = PickerProps<Value> & {
  open: boolean;
  onClose: () => void;
};

const destination = 'picker-options';

export function PickerDrillIn<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  const commands = useFormSheetCommands();

  if (commands)
    return (
      <RoutedFormSheet {...routedProps(props)} commands={commands}>
        <PickerSearchPage {...props} />
      </RoutedFormSheet>
    );

  return <StandalonePickerSheet {...props} />;
}

function StandalonePickerSheet<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <BottomSheet {...sheetProps(props)}>
      <PickerPage {...props} />
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

function PickerPage<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <Group modifiers={pageModifiers}>
      {props.open && <PickerNavigation {...props} />}
    </Group>
  );
}

const pageModifiers = [
  presentationDetents(['large']),
  presentationBackground(groupedBackground ?? 'clear'),
];

function PickerNavigation<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <NavigationStack {...usePickerPath(props.onClose)}>
      <PickerRoutes {...props} />
    </NavigationStack>
  );
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

function PickerRoutes<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <>
      <Text modifiers={[navigationTitle('Back')]}>{props.label}</Text>
      <NavigationDestination value={destination}>
        <PickerDestination {...props} />
      </NavigationDestination>
    </>
  );
}

function PickerDestination<Value extends string>(
  props: DrillProps<Value>,
): React.JSX.Element {
  return (
    <Group modifiers={destinationModifiers(props.label)}>
      <RNHostView>
        <PickerSearchPage {...props} />
      </RNHostView>
    </Group>
  );
}

function destinationModifiers(
  label: string,
): ReturnType<typeof navigationTitle>[] {
  return [navigationTitle(label), navigationBarTitleDisplayMode('inline')];
}

function routedProps<Value extends string>(
  props: DrillProps<Value>,
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
