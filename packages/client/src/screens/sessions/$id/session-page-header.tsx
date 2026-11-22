import { Action } from '@repo/kit/primitives/actions/action';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import {
  type SessionPanels,
  type SessionPluginActions,
} from '#features/sessions';
import { openNewShell } from './sections/runs-section';
import type { SessionDetailViewProps } from './session-detail-view';
import { sessionHeaderActions } from './session-header-actions';
import {
  type HeaderPlacement,
  type ToggleWorkbenchCard,
  usePluginHeaderActions,
} from './use-plugin-header-actions';
import { type WorkbenchCards, toggleCardSheet } from './use-workbench-cards';

const noPluginActions: SessionPluginActions = { beside: [], menu: [] };

const pluginActionsOf = (props: SessionDetailViewProps): SessionPluginActions =>
  (props.state === 'open' && props.header.pluginActions) || noPluginActions;

// The Session's header declares its Actions once. Compact widths also offer the Workbench's sections.
export function SessionPageHeader(
  props: SessionDetailViewProps,
): React.JSX.Element {
  return (
    <SizeClass
      compact={stackHeader(props, true)}
      wide={stackHeader(props, false)}
    />
  );
}

function directActions(
  props: SessionDetailViewProps,
  compact: boolean,
): React.JSX.Element[] {
  if (props.state !== 'open') return [];

  const terminal = compact
    ? props.onNewPhoneTerminal
    : openNewShell(props.runs, props.inspectorPanels);

  const workbench = compact ? props.onOpenWorkbench : undefined;

  return [
    ...(terminal
      ? [
          <Action
            key="terminal"
            label="New Terminal"
            icon="terminal"
            onPress={terminal}
          />,
        ]
      : []),
    ...(workbench
      ? [
          <Action
            key="workbench"
            label="Workbench"
            icon="workbench"
            onPress={workbench}
          />,
        ]
      : []),
  ];
}

function stackHeader(
  props: SessionDetailViewProps,
  compact: boolean,
): React.JSX.Element {
  return (
    <ScreenStackHeader
      title={props.state === 'open' ? props.header.title : 'Session'}
      actions={sessionHeaderActions(
        props.state === 'open' ? props.header.menu : undefined,
        pluginActionsOf(props),
        directActions(props, compact),
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

// Where a header action's Workbench card opens: the column on a wide window, the Inspector's sheet on a phone.
export interface HeaderCards {
  sessionId: string;
  cards: WorkbenchCards;
  // Absent until the Session is open, when nothing has a card to toggle yet.
  panels?: SessionPanels;
}

// The header on the App: the enabled Plugins' actions, read from their manifests, join Argo's.
export function ConnectedSessionHeader(
  props: SessionDetailViewProps & HeaderCards,
): React.JSX.Element {
  return (
    <SizeClass
      compact={<PlacedSessionHeader {...props} compact />}
      wide={<PlacedSessionHeader {...props} compact={false} />}
    />
  );
}

// A phone has no Workbench column, so a card opens as the Inspector's sheet; a wide window shows it in the column.
const cardToggle = (
  { cards, panels }: Omit<HeaderCards, 'sessionId'>,
  compact: boolean,
): ToggleWorkbenchCard =>
  compact && panels ? toggleCardSheet(panels) : cards.toggle;

// Where the header sits, and how its card actions toggle and which cards have something to show.
const headerPlacement = (
  { sessionId, cards, panels }: HeaderCards,
  compact: boolean,
): HeaderPlacement => ({
  sessionId,
  compact,
  toggleCard: cardToggle({ cards, panels }, compact),
  filled: cards.filled,
});

// One size class's header: a compact window keeps every Plugin action in "…", a wide one gives the first an icon.
function PlacedSessionHeader({
  sessionId,
  compact,
  cards,
  panels,
  ...props
}: SessionDetailViewProps &
  HeaderCards & { compact: boolean }): React.JSX.Element {
  const pluginActions = usePluginHeaderActions(
    headerPlacement({ sessionId, cards, panels }, compact),
  );

  return <SessionPageHeader {...withPluginActions(props, pluginActions)} />;
}
