import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import {
  ActionShortcutScope,
  useActionShortcutScope,
} from '#primitives/actions/action-list';
import { HeadingRow } from './screen-heading-row';
import { useScreenNavigator } from './screen-navigation-context';
import type { ScreenHeaderInput } from './screen-props';

export function ScreenNavigation(props: ScreenHeaderInput): ReactNode {
  const navigator = useScreenNavigator();
  const wide = useWide();
  const headerTitle = useHeaderTitle(props);

  if (!navigator) return null;

  const options = { ...headerLayout, title: props.title, headerTitle };

  return <Stack.Screen options={{ ...options, headerShown: !wide }} />;
}

// The navigator draws the header outside the Screen's tree, so its Actions join the Screen's shortcut scope explicitly.
function useHeaderTitle(props: ScreenHeaderInput): () => React.ReactElement {
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
