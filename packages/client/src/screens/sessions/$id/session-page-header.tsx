import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type SessionHeaderProps,
  type SessionMenu,
  type SessionPluginActions,
} from '#features/sessions';
import {
  type SessionDetailViewProps,
  sessionPageTitle,
} from './session-detail-view';
import { sessionHeaderActions } from './session-header-actions';

function headerMenuOf(props: SessionDetailViewProps): SessionMenu | undefined {
  if (props.state !== 'open' || !props.header.menu) return undefined;

  return { ...props.header.menu, changes: menuChanges(props.header.changes) };
}

function menuChanges(
  changes: SessionHeaderProps['changes'],
): SessionMenu['changes'] {
  if (!changes?.summary) return undefined;

  return {
    files: changes.summary.files,
    onPress: () => changes.onOpenChange(true),
  };
}

const noPluginActions: SessionPluginActions = { beside: [], menu: [] };

const pluginActionsOf = (props: SessionDetailViewProps): SessionPluginActions =>
  (props.state === 'open' && props.header.pluginActions) || noPluginActions;

// A narrow window's header: the Session's title, the Plugins' actions and its ⋯ menu. The page's body is the Session's own, so only the header is a Screen's.
export function SessionPageHeader(
  props: SessionDetailViewProps,
): React.JSX.Element {
  return (
    <ScreenStackHeader
      title={sessionPageTitle(props)}
      actions={sessionHeaderActions(
        headerMenuOf(props),
        pluginActionsOf(props),
      )}
    />
  );
}
