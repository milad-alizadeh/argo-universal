import type { ReactElement } from 'react';
import { View } from 'react-native';
import { BottomSheetContent } from './bottom-sheet-content';
import {
  SheetNavigationProvider,
  useFormSheetCommands,
  useFormSheetState,
} from './form-sheet-context';
import type { FormSheetProps } from './form-sheet-props';

type PageProps = {
  onContentHeightChange?: (height: number) => void;
};

export function FormSheetRoot(props: PageProps): ReactElement | null {
  const sheet = useFormSheetState();
  const commands = useFormSheetCommands();

  if (!sheet || !commands) return null;

  return (
    <SheetNavigationProvider value={commands}>
      <SheetBody {...props} sheet={sheet.props} />
    </SheetNavigationProvider>
  );
}

function SheetBody(props: PageProps & { sheet: FormSheetProps }): ReactElement {
  return props.sheet.headerTitle ? (
    <View className="flex-1 bg-card">{props.sheet.children}</View>
  ) : (
    <BottomSheetContent {...props.sheet} {...props} fit={false} />
  );
}

// A page's content is its own list, which keeps itself below a transparent header.
export function FormSheetChoices(): ReactElement | null {
  const page = useFormSheetState()?.page;

  return page ? <View className="flex-1 bg-card">{page.content}</View> : null;
}
