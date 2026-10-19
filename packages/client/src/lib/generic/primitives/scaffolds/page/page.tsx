import { use, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import { PageAccessory } from './page-accessory';
import { usePageColumn } from './page-column';
import {
  PageContentActionsProvider,
  usePageContentActionsState,
  type SetContentActions,
} from './page-content-actions';
import { PageHeading } from './page-heading';
import { PageNavigation } from './page-navigation';
import type { PageProps } from './page-props';
import { usePageSearch } from './use-page-search';

export function Page(props: PageProps): ReactElement {
  const search = usePageSearch(props);

  return (
    <ActionShortcutScope>
      <PageSurface {...props} {...search} />
    </ActionShortcutScope>
  );
}

function PageSurface(props: PageProps): ReactElement {
  const content = usePageContentActionsState();
  const header = { ...props, actions: headerActions(props, content.actions) };

  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset"
    >
      <PageNavigation {...header} />
      <PageHeading {...header} />
      <PageBody {...props} setContentActions={content.setActions} />
      <PageAccessory {...props} />
    </View>
  );
}

// The page's own Actions first, then those its content handed up.
function headerActions(props: PageProps, content: ReactNode): ReactNode {
  if (!content) return props.actions;

  return (
    <>
      {props.actions}
      {content}
    </>
  );
}

function PageBody(
  props: PageProps & { setContentActions: SetContentActions },
): ReactElement {
  const { column, className } = usePageBody(props);

  return (
    <View className={className}>
      <PageContentActionsProvider value={props.setContentActions}>
        <ScrollColumnContext value={column}>
          {props.children}
        </ScrollColumnContext>
      </PageContentActionsProvider>
    </View>
  );
}

function usePageBody(props: PageProps): PageBodyStyle {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);
  const column = usePageColumn();

  return {
    column: wide ? column : inherited,
    className: bodyClass(props, wide),
  };
}

interface PageBodyStyle {
  column: React.ContextType<typeof ScrollColumnContext>;
  className: string;
}

function bodyClass(props: PageProps, wide: boolean): string {
  return cn(
    'min-h-0 flex-1',
    !wide && hasFab(props) && 'android:pb-safe-offset-22',
  );
}

// Android's FAB, which the body's end clears; an unavailable primary Action shows none.
function hasFab(props: PageProps): boolean {
  return Boolean(props.primaryAction && !props.primaryAction.disabled);
}
