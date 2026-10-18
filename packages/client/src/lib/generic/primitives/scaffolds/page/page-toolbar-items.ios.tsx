import { Stack } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import type { DeclaredAction } from '#primitives/actions/action-list';
import type { PageProps } from './page-props';
import { pageToolbarIcon } from './page-toolbar-icon.ios';

type ToolbarButton = ComponentProps<typeof Stack.Toolbar.Button>;

export function toolbarAction(
  action: NonNullable<PageProps['primaryAction']>,
): ToolbarButton {
  return {
    icon: pageToolbarIcon(action.icon),
    accessibilityLabel: action.label,
    disabled: action.disabled,
    onPress: action.onPress,
  };
}

export function toolbarButton(action: DeclaredAction): ReactElement {
  return <Stack.Toolbar.Button key={action.id} {...toolbarAction(action)} />;
}

export function overflowMenu(actions: DeclaredAction[]): ReactElement | null {
  if (!actions.length) return null;

  return (
    <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More actions">
      {actions.map(menuAction)}
    </Stack.Toolbar.Menu>
  );
}

function menuAction(action: DeclaredAction): ReactElement {
  const props = {
    icon: pageToolbarIcon(action.icon),
    onPress: action.onPress,
    disabled: action.disabled,
    destructive: action.tone === 'danger',
  };

  return (
    <Stack.Toolbar.MenuAction key={action.id} {...props}>
      {action.label}
    </Stack.Toolbar.MenuAction>
  );
}
