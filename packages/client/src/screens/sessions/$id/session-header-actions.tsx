import { Action } from '@repo/kit/primitives/actions/action';
import type * as React from 'react';
import {
  type SessionMenu,
  type SessionPluginAction,
  type SessionPluginActions,
  sessionActions,
} from '#features/sessions';
import { pluginSymbol } from '../../../lib/product/plugin-symbol';

// A Plugin's action, keyed by its Plugin so two Plugins' ids never meet, drawn with the Plugin's own icon.
const pluginAction = ({
  pluginId,
  item,
  onPress,
}: SessionPluginAction): React.JSX.Element => (
  <Action
    key={`${pluginId}/${item.id}`}
    label={item.label}
    icon={pluginSymbol(item.icon)}
    onPress={onPress}
  />
);

// Inside ⋯ the Plugins' actions follow Argo's own, in a Section of their own.
function moreEntries(
  menu: SessionMenu | undefined,
  plugins: readonly SessionPluginAction[],
): React.JSX.Element[] {
  const coreActions = menu ? sessionActions(menu) : [];

  if (!plugins.length) return coreActions;

  return [
    ...coreActions,
    <Action.Section key="plugins">{plugins.map(pluginAction)}</Action.Section>,
  ];
}

// The Session's ⋯ holds Session actions and the Plugins' menu actions.
function moreAction(
  menu: SessionMenu | undefined,
  plugins: readonly SessionPluginAction[],
): React.JSX.Element[] {
  const entries = moreEntries(menu, plugins);

  if (!entries.length) return [];

  return [
    <Action key="more" label="More" icon="more">
      {entries}
    </Action>,
  ];
}

// In a wide window's title bar the More menu's entries are the title's own menu, and the direct Actions stay beside it as icons.
export function sessionTitleBarActions(
  menu: SessionMenu | undefined,
  plugins: SessionPluginActions,
  direct: readonly React.JSX.Element[] = [],
): { titleMenu: React.JSX.Element[]; actions: React.JSX.Element[] } {
  return {
    titleMenu: moreEntries(menu, plugins.menu),
    actions: [...plugins.beside.map(pluginAction), ...direct],
  };
}

/*
 * The Session header's direct Actions precede the More menu.
 */
export function sessionHeaderActions(
  menu: SessionMenu | undefined,
  plugins: SessionPluginActions,
  direct: readonly React.JSX.Element[] = [],
): React.JSX.Element[] {
  return [
    ...plugins.beside.map(pluginAction),
    ...direct,
    ...moreAction(menu, plugins.menu),
  ];
}
