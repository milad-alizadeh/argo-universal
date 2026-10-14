import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import { SheetNavigationProvider } from './form-sheet-context';
import type { SheetPage } from './form-sheet-props';

type Navigation = { push: (page: SheetPage) => void; back: () => void };

// The pushed page, dropped whenever the sheet opens or closes.
function useSheetPage(open: boolean): [SheetPage | undefined, Navigation] {
  const [state, setState] = useState<{ open: boolean; page?: SheetPage }>({
    open,
  });

  if (state.open !== open) setState({ open });

  const navigation = useMemo(
    () => ({
      push: (page: SheetPage): void => setState((last) => ({ ...last, page })),
      back: (): void => setState((last) => ({ open: last.open })),
    }),
    [],
  );

  return [state.page, navigation];
}

/*
 * A web sheet's pages: a drill row inside the sheet pushes a page in place of the sheet's content,
 * with a back button to return. The sheet's own content stays mounted under the page, so the drill
 * row keeps its page current.
 */
export function SheetPages(props: {
  open: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const [page, navigation] = useSheetPage(props.open);

  return (
    <SheetNavigationProvider value={navigation}>
      <View className={page ? 'hidden' : 'contents'}>{props.children}</View>
      {page && <PushedPage page={page} back={navigation.back} />}
    </SheetNavigationProvider>
  );
}

function PushedPage(props: {
  page: SheetPage;
  back: () => void;
}): React.JSX.Element {
  return (
    <View className="bg-content">
      <PageHeader {...props} />
      {props.page.content}
    </View>
  );
}

const backButton = {
  variant: 'ghost',
  icon: 'chevron-left',
  accessibilityLabel: 'Back',
} as const;

function PageHeader(props: {
  page: SheetPage;
  back: () => void;
}): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center px-2">
      <IconButton {...backButton} onPress={props.back} />
      <Text role="control" className="flex-1 text-center">
        {props.page.title}
      </Text>
      <View className="size-11" />
    </View>
  );
}
