import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { drawerLeading } from './screen-drawer-button';
import { HeadingRow } from './screen-heading-row';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderPlanned } from './screen-props';
import { selectionOptions } from './screen-selection-options';

// The navigator's entry for the Screen; its header shows only where the plan draws it there.
export function ScreenNavigation(props: ScreenHeaderPlanned): ReactNode {
  const headerTitle = useHeaderTitle(props);
  const leading = drawerLeading(useScreenMenu());

  if (!props.plan.stackEntry) return null;

  const options = { ...headerLayout, title: props.title ?? '', headerTitle };

  const headerOptions = {
    ...options,
    ...selectionOptions(props.declaration.selection, leading),
    headerShown: props.plan.site === 'stack',
  };

  return <Stack.Screen options={headerOptions} />;
}

// The navigator draws the header outside the Screen's tree, so it draws the Actions the Screen declared.
function useHeaderTitle(props: ScreenHeaderPlanned): () => React.ReactElement {
  return () => <HeadingRow {...props} />;
}

const headerLayout = {
  headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1 },
  headerRightContainerStyle: { flexGrow: 0 },
};
