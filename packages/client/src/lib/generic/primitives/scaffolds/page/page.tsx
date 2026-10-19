import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import { PageAccessory } from './page-accessory';
import { usePageColumn } from './page-column';
import { PageHeading } from './page-heading';
import { PageNavigation } from './page-navigation';
import { pagePrimaryAction } from './page-primary-action';
import type { PageProps } from './page-props';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Page(props: PageProps): ReactElement {
  return (
    <ActionShortcutScope>
      <PageSurface {...props} />
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
      <PageBody {...props} />
      <PageAccessory {...props} />
    </View>
  );
}

function PageBody(props: PageProps): ReactElement {
  const { column, className } = usePageBody(props);

  return (
    <View className={className}>
      <ScrollColumnContext value={column}>{props.children}</ScrollColumnContext>
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
