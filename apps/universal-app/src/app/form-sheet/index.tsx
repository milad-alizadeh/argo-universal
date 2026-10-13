import {
  FormSheetRoot,
  useFormSheetCommands,
  useFormSheetState,
} from '@repo/client';
import { Stack, useNavigation } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import { formSheetRoutes } from '@/navigation/form-sheet';
import { useSheetContentInset } from '@/navigation/use-sheet-content-inset';
import { useSheetHeight } from '@/navigation/use-sheet-height';

export default function FormSheetIndex(): ReactElement {
  usePickerPageHeight();

  return (
    <>
      <FormSheetRoot
        headerInset={useSheetContentInset()}
        onContentHeightChange={useSheetHeight()}
      />
      <SheetBackButton />
    </>
  );
}

function usePickerPageHeight(): void {
  const navigation = useNavigation();
  const isPage = !!useFormSheetState()?.props.headerTitle;
  useEffect(() => {
    if (isPage)
      navigation.getParent()?.setOptions({ sheetAllowedDetents: [1] });
  }, [navigation, isPage]);
}

function SheetBackButton(): ReactElement | null {
  const title = useFormSheetState()?.props.headerTitle;
  const commands = useFormSheetCommands();

  const close = (): void => {
    commands?.closed();
    formSheetRoutes?.dismiss();
  };

  return title ? (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="chevron.backward" onPress={close}>
        Back
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  ) : null;
}
