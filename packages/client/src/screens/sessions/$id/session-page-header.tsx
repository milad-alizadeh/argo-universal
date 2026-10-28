import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
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
import {
  type HeaderPlacement,
  usePluginHeaderActions,
} from './use-plugin-header-actions';

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

const withPluginActions = (
  props: SessionDetailViewProps,
  pluginActions: SessionPluginActions,
): SessionDetailViewProps =>
  props.state === 'open'
    ? { ...props, header: { ...props.header, pluginActions } }
    : props;

// The header on the App: the enabled Plugins' actions, read from their manifests, join Argo's.
export function ConnectedSessionHeader(
  props: SessionDetailViewProps & { sessionId: string },
): React.JSX.Element {
  return (
    <SizeClass
      compact={<PlacedSessionHeader {...props} compact />}
      wide={<PlacedSessionHeader {...props} compact={false} />}
    />
  );
}

// One size class's header: a compact window keeps every Plugin action in "…", a wide one gives the first an icon.
function PlacedSessionHeader({
  sessionId,
  compact,
  ...props
}: SessionDetailViewProps & HeaderPlacement): React.JSX.Element {
  const pluginActions = usePluginHeaderActions({ sessionId, compact });

  return <SessionPageHeader {...withPluginActions(props, pluginActions)} />;
}
