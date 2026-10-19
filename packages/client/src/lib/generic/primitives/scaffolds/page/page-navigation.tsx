import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import {
  ActionShortcutScope,
  useActionShortcutScope,
} from '#primitives/actions/action-list';
import { HeadingRow } from './page-heading-row';
import { usePageNavigator } from './page-navigation-context';
import type { PageHeaderInput } from './page-props';

export function PageNavigation(props: PageHeaderInput): ReactNode {
  const navigator = usePageNavigator();
  const wide = useWide();
  const headerTitle = useHeaderTitle(props);

  if (!navigator) return null;

  const options = { ...headerLayout, title: props.title, headerTitle };

  return <Stack.Screen options={{ ...options, headerShown: !wide }} />;
}

// The navigator draws the header outside the Page's tree, so its Actions join the Page's shortcut scope explicitly.
function useHeaderTitle(props: PageHeaderInput): () => React.ReactElement {
  const scope = useActionShortcutScope();

  return () => (
    <ActionShortcutScope scope={scope}>
      <HeadingRow {...props} />
    </ActionShortcutScope>
  );
}

const headerLayout = {
  headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1 },
  headerRightContainerStyle: { flexGrow: 0 },
};
