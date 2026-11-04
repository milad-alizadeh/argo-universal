import {
  type DeclaredItemOf,
  sessionWorkbenchSlot,
} from '@repo/contracts/plugins/declared-slots';
import { type ReactNode } from 'react';
import {
  type SessionPanels,
  SessionMemory,
  useSessionMemory,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { BoundedPluginTree } from '../../../lib/product/plugin-registry';
import { useOpenPluginPage } from '../../plugins/use-plugin-opener';
import { usePluginPage } from '../../plugins/use-plugin-page';
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

// The cards each Session has closed, kept while the person is in another Session.
const closedCards = new SessionMemory<readonly string[]>([]);

const without = (keys: readonly string[], key: string): string[] =>
  keys.filter((closed) => closed !== key);

const toggled = (keys: readonly string[], key: string): string[] =>
  keys.includes(key) ? without(keys, key) : [...keys, key];

// The Session a card draws for, and its Project once the Session's Feed has said which it is.
export type CardSession = { sessionId: string; projectId?: string };

/*
 * The Plugin cards a Session draws: every card the enabled Plugins declare and this Device shows, less the ones the
 * user has closed. A card is in the Workbench from the moment the Session opens, as Argo's own are, and a Plugin's
 * header action closes it and opens it again (ADR-0035).
 */
export function useWorkbenchCards(session: CardSession): WorkbenchCards {
  const declared = useDeclaredWorkbenchCards();
  const [closed, setClosed] = useSessionMemory(closedCards, session.sessionId);

  return {
    open: declared
      .filter((card) => !closed.includes(keyOf(card)))
      .map((card) => drawnCard(card, session)),
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
  session: CardSession,
  path: string,
): ReactNode => <PluginCardPage pluginId={pluginId} path={path} {...session} />;

// A card and its full view are the Plugin's own Loader pages, drawn for this Session (ADR-0035, ADR-0050).
const drawnCard = (
  { pluginId, item }: DeclaredCard,
  session: CardSession,
): SessionPluginCard => ({
  pluginId,
  card: item,
  page: cardPage(pluginId, session, item.page),
  tab: item.tab && cardPage(pluginId, session, item.tab),
});

type CardPage = CardSession & { pluginId: string; path: string };

/*
 * One Plugin page inside a card or its Inspector tab, drawn for this Session as the Plugin's own Loader pages
 * are. The card's frame is Argo's and draws at once; the page fills it once the Session's Project is known and
 * the Plugin has answered (ADR-0025 lazy start).
 */
function PluginCardPage(props: CardPage): ReactNode {
  if (props.projectId === undefined) return null;

  return <DrawnCardPage {...props} projectId={props.projectId} />;
}

function DrawnCardPage(props: CardPage & { projectId: string }): ReactNode {
  const page = usePluginPage(props);
  const openPage = useOpenPluginPage();

  if (!page.root) return null;

  return (
    <BoundedPluginTree
      root={page.root}
      onOpenPage={(opened) => openPage(props.pluginId, opened)}
      onPageCall={page.onPageCall}
    />
  );
}

// What a header action does to a card on a phone, where there is no column: its sheet is the card's Inspector tab.
export const toggleCardSheet =
  (panels: SessionPanels): ToggleWorkbenchCard =>
  (pluginId, cardId) =>
    panels.toggle(pluginCardKey(pluginId, cardId));
