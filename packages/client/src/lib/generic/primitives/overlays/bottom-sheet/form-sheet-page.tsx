import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { pageSurface, sheetSurfaceStyle } from '#primitives/native/surface';
import { BottomSheetContent } from './bottom-sheet-content';
import {
  SheetNavigationProvider,
  useFormSheetCommands,
  useFormSheetState,
} from './form-sheet-context';
import type { FormSheetProps } from './form-sheet-props';

type PageProps = {
  headerInset?: number;
  onContentHeightChange?: (height: number) => void;
};

const pageClass = cn('flex-1', pageSurface);

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
    <View
      className={pageClass}
      style={[sheetSurfaceStyle, { paddingTop: props.headerInset }]}
    >
      {props.sheet.children}
    </View>
  ) : (
    <BottomSheetContent {...props.sheet} {...props} fit={false} />
  );
}

export function FormSheetChoices(props: PageProps): ReactElement | null {
  const page = useFormSheetState()?.page;

  return page ? (
    <View
      className={pageClass}
      style={[sheetSurfaceStyle, { paddingTop: props.headerInset }]}
    >
      {page.content}
    </View>
  ) : null;
}
