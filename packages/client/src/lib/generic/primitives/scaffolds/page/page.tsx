import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import { usePageColumn } from './page-column';
import { PageHeading } from './page-heading';
import { PageNavigation } from './page-navigation';
import type { PageProps } from './page-props';
import { usePageSearch } from './use-page-search';

export function Page(props: PageProps): ReactElement {
  const search = usePageSearch(props.search);

  return (
    <ActionShortcutScope>
      <PageSurface {...props} search={search} />
    </ActionShortcutScope>
  );
}

function PageSurface(props: PageProps): ReactElement {
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset"
    >
      <PageNavigation {...props} />
      <PageHeading {...props} />
      <PageBody>{props.children}</PageBody>
    </View>
  );
}

function PageBody({ children }: Pick<PageProps, 'children'>): ReactElement {
  const column = usePageColumn();

  return (
    <View className="min-h-0 flex-1">
      <ScrollColumnContext value={column}>{children}</ScrollColumnContext>
    </View>
  );
}
