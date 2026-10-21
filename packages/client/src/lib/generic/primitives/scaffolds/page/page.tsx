import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import {
  ActionListHeaderContext,
  ActionShortcutScope,
  type HeaderSink,
} from '#primitives/actions/action-list';
import { SvgBudget } from '#primitives/visual';
import { PageAccessory } from './page-accessory';
import { usePageColumn } from './page-column';
import { PageHeaderSinkProvider } from './page-header-actions';
import { PageHeading } from './page-heading';
import { PageNavigation } from './page-navigation';
import { pagePrimaryAction } from './page-primary-action';
import type { PageProps } from './page-props';
import { usePageActions } from './use-page-actions';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Page(props: PageProps): ReactElement {
  return (
    <SvgBudget>
      <ActionShortcutScope>
        <PageSurface {...props} />
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The page's own Actions register first, so they lead those its content hands up.
function PageSurface(props: PageProps): ReactElement {
  const header = usePageActions();

  // Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <OwnActions register={header.register} actions={props.actions} />
      <PageNavigation {...props} header={header} />
      <PageHeading {...props} header={header} />
      <PageBody {...props} register={header.register} />
      <PageAccessory {...props} />
    </View>
  );
}

// Mounted for their registration only: the lists leave just their shortcut anchors, out of the Page's layout.
function OwnActions(
  props: Pick<PageProps, 'actions'> & { register: HeaderSink },
): ReactElement {
  return (
    <ActionListHeaderContext value={props.register}>
      <View className="absolute">{props.actions}</View>
    </ActionListHeaderContext>
  );
}

function PageBody(props: PageProps & { register: HeaderSink }): ReactElement {
  const { column, className } = usePageBody(props);

  return (
    <View className={className}>
      <PageHeaderSinkProvider value={props.register}>
        <ScrollColumnContext value={column}>
          {props.children}
        </ScrollColumnContext>
      </PageHeaderSinkProvider>
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
  const action = pagePrimaryAction(props);

  return Boolean(action && !action.disabled);
}
