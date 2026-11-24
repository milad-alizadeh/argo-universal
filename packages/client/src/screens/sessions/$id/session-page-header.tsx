import { Action } from '@repo/kit/primitives/actions/action';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import {
  type SessionPanels,
  type SessionPluginActions,
} from '#features/sessions';
import {
  feedTrayInsetClass,
  SessionColumn,
  useFeedTrayInset,
} from '#lib/product/session-column';
import { openNewShell } from './sections/runs-section';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  sessionHeaderActions,
  sessionTitleBarActions,
} from './session-header-actions';
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
  const inset = useFeedTrayInset(
    props.state === 'open' ? props.feed.opensAtStart : true,
  );

  const headingColumn = (children: React.ReactNode): React.JSX.Element => (
    <SessionColumn className={inset ? feedTrayInsetClass : undefined}>
      {children}
    </SessionColumn>
  );

  return (
    <SizeClass
      compact={compactHeader(props)}
      wide={wideHeader(props, headingColumn)}
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

const menuOf = (
  props: SessionDetailViewProps,
):
  | Extract<SessionDetailViewProps, { state: 'open' }>['header']['menu']
  | undefined => (props.state === 'open' ? props.header.menu : undefined);

const titleOf = (props: SessionDetailViewProps): string =>
  props.state === 'open' ? props.header.title : 'Session';

// A phone keeps the Session's actions under ⋯ in its stack header.
function compactHeader(props: SessionDetailViewProps): React.JSX.Element {
  return (
    <ScreenStackHeader
      title={titleOf(props)}
      actions={sessionHeaderActions(
        menuOf(props),
        pluginActionsOf(props),
        directActions(props, true),
      )}
    />
  );
}

/*
 * A wide window titles the Session in its title bar, as Claude's and Codex's do: the title opens the Session's menu,
 * and the direct Actions sit beside it. Where no title bar is offered the heading stays at the column's top.
 */
function wideHeader(
  props: SessionDetailViewProps,
  headingColumn: React.ComponentProps<
    typeof ScreenStackHeader
  >['headingColumn'],
): React.JSX.Element {
  const { titleMenu, actions } = sessionTitleBarActions(
    menuOf(props),
    pluginActionsOf(props),
    directActions(props, false),
  );

  return (
    <ScreenStackHeader
      inTitleBar
      headingColumn={headingColumn}
      title={titleOf(props)}
      titleMenu={titleMenu}
      actions={actions}
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
