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
  const argo = menu
    ? sessionActions(menu, { changesIcon: 'changed-files' })
    : [];

  if (!plugins.length) return argo;

  return [
    ...argo,
    <Action.Section key="plugins">{plugins.map(pluginAction)}</Action.Section>,
  ];
}

// The Session's ⋯: one header Action whose menu holds changed files, Rename, Archive and the Plugins' menu actions, declared as a Plugin page declares its Screen's Actions.
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

/*
 * The Session header's Actions: the Plugins' header actions, then ⋯. They sit before ⋯ so that ⋯ keeps its place at
 * the start of the trailing controls (docs/agents/layout.md).
 */
export function sessionHeaderActions(
  menu: SessionMenu | undefined,
  plugins: SessionPluginActions,
): React.JSX.Element[] {
  return [
    ...plugins.beside.map(pluginAction),
    ...moreAction(menu, plugins.menu),
  ];
}
