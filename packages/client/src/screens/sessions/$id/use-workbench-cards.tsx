import {
  type DeclaredItemOf,
  sessionWorkbenchSlot,
} from '@repo/contracts/plugins/declared-slots';
import { type ReactNode, useState } from 'react';
import type { SessionPanels } from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { PluginTree } from '../../../lib/product/plugin-registry';
import { useOpenPluginPage } from '../../plugins/use-plugin-opener';
import { usePluginView } from '../../plugins/use-plugin-view';
import {
  pluginCardKey,
  type SessionPluginCard,
} from './sections/plugin-card-section';
import { useDeclaredItems } from './use-declared-items';
import type { ToggleWorkbenchCard } from './use-plugin-header-actions';

type DeclaredCard = DeclaredItemOf<typeof sessionWorkbenchSlot>;

// The Session's Plugin cards, and what a header action does to one.
export interface WorkbenchCards {
  // The cards the Session has open, in Slot order, each with the Plugin's pages inside it.
  open: readonly SessionPluginCard[];
  // Toggles a card in the Workbench column, where there is one.
  toggle: ToggleWorkbenchCard;
}

// A closed card is held by the key its Section draws under, so the two can never drift apart.
const keyOf = ({ pluginId, item }: DeclaredCard): string =>
  pluginCardKey(pluginId, item.id);

const without = (keys: readonly string[], key: string): string[] =>
  keys.filter((closed) => closed !== key);

const toggled = (keys: readonly string[], key: string): string[] =>
  keys.includes(key) ? without(keys, key) : [...keys, key];

/*
 * The Plugin cards a Session draws: every card the enabled Plugins declare and this Device shows, less the ones the
 * user has closed. A card is in the Workbench from the moment the Session opens, as Argo's own are, and a Plugin's
 * header action closes it and opens it again (ADR-0035).
 */
export function useWorkbenchCards(sessionId: string): WorkbenchCards {
  const declared = useDeclaredWorkbenchCards();
  const [closed, setClosed] = useState<readonly string[]>([]);

  return {
    open: declared
      .filter((card) => !closed.includes(keyOf(card)))
      .map((card) => drawnCard(card, sessionId)),
    toggle: (pluginId, cardId) =>
      setClosed((keys) => toggled(keys, pluginCardKey(pluginId, cardId))),
  };
}

// The cards the enabled Plugins declare, in Slot order, less the Plugins this Device turned off for the Slot.
function useDeclaredWorkbenchCards(): DeclaredCard[] {
  const { shows } = useSlotVisibility(sessionWorkbenchSlot.id);

  return useDeclaredItems(sessionWorkbenchSlot).filter(({ pluginId }) =>
    shows(pluginId),
  );
}

// One of a card's pages, drawn for this Session.
const cardPage = (
  pluginId: string,
  sessionId: string,
  path: string,
): ReactNode => (
  <PluginCardPage pluginId={pluginId} path={path} sessionId={sessionId} />
);

// A card and its full view are the Plugin's own pages, drawn for this Session (ADR-0035).
const drawnCard = (
  { pluginId, item }: DeclaredCard,
  sessionId: string,
): SessionPluginCard => ({
  pluginId,
  card: item,
  page: cardPage(pluginId, sessionId, item.page),
  tab: item.tab && cardPage(pluginId, sessionId, item.tab),
});

interface CardPage {
  pluginId: string;
  path: string;
  sessionId: string;
}

/*
 * One Plugin page inside a card or its Inspector tab, watched for this Session as the Plugin's own pages are. The
 * card's frame is Argo's and draws at once; the page fills it when the Plugin answers (ADR-0025 lazy start).
 */
function PluginCardPage({ pluginId, path, sessionId }: CardPage): ReactNode {
  const view = usePluginView({ pluginId, path, sessionId });
  const openPage = useOpenPluginPage();

  if (!view.root) return null;

  return (
    <PluginTree
      key={view.viewId}
      root={view.root}
      onEvent={view.dispatch}
      onOpenPage={(page) => openPage(pluginId, page)}
    />
  );
}

// What a header action does to a card on a phone, where there is no column: its sheet is the card's Inspector tab.
export const toggleCardSheet =
  (panels: SessionPanels): ToggleWorkbenchCard =>
  (pluginId, cardId) =>
    panels.toggle(pluginCardKey(pluginId, cardId));
