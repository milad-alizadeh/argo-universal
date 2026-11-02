import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { drawerLeading } from './screen-drawer-button';
import { HeadingRow } from './screen-heading-row';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderPlanned } from './screen-props';
import { selectionOptions } from './screen-selection-options';

// The navigator's entry for the Screen; its header shows only where the plan draws it there.
export function ScreenNavigation(props: ScreenHeaderPlanned): ReactNode {
  const headerTitle = headerTitleOf(props);
  const leading = drawerLeading(useScreenMenu());

  if (!props.plan.stackEntry) return null;

  const headerOptions = {
    ...headerLayout,
    title: props.title ?? '',
    headerTitle,
    ...selectionOptions(props.declaration.selection, leading),
    headerShown: props.plan.site === 'stack',
  };

  return <Stack.Screen options={headerOptions} />;
}

// The navigator draws the header outside the Screen's tree, so it draws the Actions the Screen declared.
function headerTitleOf(props: ScreenHeaderPlanned): () => React.ReactElement {
  return () => <HeadingRow {...props} />;
}

// The title's row takes the width the navigator reserves at the end, and its last icon's glyph ends on the page's right edge.
const headerLayout = {
  headerTitleContainerStyle: {
    flexGrow: 1,
    flexShrink: 1,
    marginEnd: 8,
    maxWidth: '100%',
  },
  headerRightContainerStyle: { flexGrow: 0 },
};
