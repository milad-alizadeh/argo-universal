import { Stack } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { isCustomSymbol } from '#lib/generic/symbols/custom-symbols';
import { resolveIcon } from '#lib/generic/symbols/icon-symbol';
import { tablerAsset } from '#lib/generic/symbols/tabler-symbols';
import type {
  ActionProps,
  DeclaredAction,
} from '#primitives/actions/action-list';

type ToolbarButton = ComponentProps<typeof Stack.Toolbar.Button>;

// Template rendering tints image icons (Tabler, custom symbols) like SF Symbols, in light and dark.
const tinted = { iconRenderingMode: 'template' } as const;

function toolbarIcon(
  icon: ActionProps['icon'],
): SFSymbol | ImageSourcePropType {
  const source = resolveIcon(icon).symbol;

  if ('tabler' in source) return { uri: tablerAsset(source.tabler) };

  if (isCustomSymbol(source.sf)) return { uri: source.sf };

  return source.sf;
}

function toolbarAction(action: DeclaredAction): ToolbarButton {
  return {
    ...tinted,
    icon: toolbarIcon(action.icon),
    accessibilityLabel: action.label,
    children: action.label,
    disabled: action.disabled,
    onPress: action.onPress,
  };
}

export function toolbarButton(action: DeclaredAction): ReactElement {
  return <Stack.Toolbar.Button key={action.id} {...toolbarAction(action)} />;
}

export function overflowMenu(
  actions: DeclaredAction[],
  label: string,
): ReactElement | null {
  if (!actions.length) return null;

  return (
    <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel={label}>
      {actions.map(menuAction)}
    </Stack.Toolbar.Menu>
  );
}

function menuAction(action: DeclaredAction): ReactElement {
  const props = {
    ...tinted,
    icon: toolbarIcon(action.icon),
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
