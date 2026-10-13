import { useFormSheetCommands, useFormSheetState } from '@repo/client';
import { Stack, useNavigation } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import { bindFormSheet } from '@/navigation/form-sheet';
import { useSheetHeaderOptions } from '@/navigation/sheet-header';

export default function FormSheetLayout(): ReactElement {
  const options = useSheetHeaderOptions();
  const pages = useSheetPageOptions();
  useSheetLifecycle();
  useSheetGestures();

  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={pages.index} />
      <Stack.Screen name="choice" options={pages.choice} />
    </Stack>
  );
}

type SheetPageOptions = {
  index: { headerShown: boolean; title?: string };
  choice: { title?: string; headerBackTitle: string };
};

function useSheetPageOptions(): SheetPageOptions {
  const sheet = useFormSheetState();
  const title = sheet?.props.headerTitle;

  return {
    index: { headerShown: !!title, title },
    choice: { title: choiceTitle(sheet?.page), headerBackTitle: 'Back' },
  };
}

function useSheetLifecycle(): void {
  const navigation = useNavigation();
  const commands = useFormSheetCommands();
  useEffect(() => bindFormSheet(() => navigation.goBack()), [navigation]);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!commands) return;

        if (commands.canDismiss()) commands.closed();
        else event.preventDefault();
      }),
    [navigation, commands],
  );
}

function choiceTitle(page?: { title: string }): string | undefined {
  return page?.title;
}

function useSheetGestures(): void {
  const navigation = useNavigation();
  const dismissible = useFormSheetState()?.props.dismissible !== false;
  useEffect(
    () => navigation.setOptions({ gestureEnabled: dismissible }),
    [navigation, dismissible],
  );
}
