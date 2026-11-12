import {
  type DeclaredItemOf,
  sessionWorkbenchSlot,
} from '@repo/contracts/plugins/declared-slots';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import {
  type SessionPanels,
  SessionMemory,
  useSessionMemory,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { HeldCardStore } from './held-card-store';
import {
  type HeldCard,
  HeldCardPages,
  HeldCardView,
  PluginTabPage,
} from './plugin-card-pages';
import {
  pluginCardKey,
  type SessionPluginCard,
} from './sections/plugin-card-section';
import { useDeclaredItems } from './use-declared-items';
import type { ToggleWorkbenchCard } from './use-plugin-header-actions';

type DeclaredCard = DeclaredItemOf<typeof sessionWorkbenchSlot>;

// Whether a Plugin's card has something to show for this Session.
type CardFilled = (pluginId: string, cardId: string) => boolean;

// The Session's Plugin cards, and what a header action does to one.
export interface WorkbenchCards {
  // The cards the Session has open, in Slot order, each with the Plugin's pages inside it.
  open: readonly SessionPluginCard[];
  // A card with nothing to show has no header action either.
  filled: CardFilled;
  // Toggles a card in the Workbench column, where there is one.
  toggle: ToggleWorkbenchCard;
  // The pages of every declared card, which the page mounts once beside the Session.
  held: ReactNode;
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
 * The Plugin cards a Session draws: every card the enabled Plugins declare and this Device shows, once its page
 * answers with something, less the ones the user has closed. Each card's page is drawn from the moment the Session's
 * Project is known, through the Loader cache, and a page that answers nothing, or has not answered yet, has no
 * card, no Inspector tab and no header action (ADR-0035, ADR-0050).
 */
export function useWorkbenchCards(session: CardSession): WorkbenchCards {
  const declared = useDeclaredWorkbenchCards();
  const [closed, setClosed] = useSessionMemory(closedCards, session.sessionId);
  const held = useHeldCards(session, declared);

  return {
    open: openCards(declared, { session, closed, ...held }),
    filled: held.filled,
    toggle: (pluginId, cardId) =>
      setClosed((keys) => toggled(keys, pluginCardKey(pluginId, cardId))),
    held: held.pages,
  };
}

// The Session's card pages: the store they are held in, which cards have something to show, and the pages to mount.
interface HeldCards {
  store: HeldCardStore;
  filled: CardFilled;
  pages: ReactNode;
}

function useHeldCards(
  session: CardSession,
  declared: readonly DeclaredCard[],
): HeldCards {
  const [store] = useState(() => new HeldCardStore());
  const filled = useSyncExternalStore(store.subscribe, store.filled);

  return {
    store,
    filled: (pluginId, cardId) =>
      filled.includes(pluginCardKey(pluginId, cardId)),
    pages: heldPages(store, session, declared),
  };
}

const heldPages = (
  store: HeldCardStore,
  { sessionId, projectId }: CardSession,
  declared: readonly DeclaredCard[],
): ReactNode => (
  <HeldCardPages
    store={store}
    opening={projectId === undefined ? undefined : { sessionId, projectId }}
    cards={declared.map(heldCard)}
  />
);

type Opening = Pick<HeldCards, 'filled' | 'store'> & {
  session: CardSession;
  closed: readonly string[];
};

// The declared cards with something to show that the user has not closed, each drawn for the Session.
const openCards = (
  declared: readonly DeclaredCard[],
  { closed, filled, ...drawing }: Opening,
): SessionPluginCard[] =>
  declared.flatMap((card) =>
    filled(card.pluginId, card.item.id) && !closed.includes(keyOf(card))
      ? [drawnCard(card, drawing)]
      : [],
  );

// The cards the enabled Plugins declare, in Slot order, less the Plugins this Device turned off for the Slot.
function useDeclaredWorkbenchCards(): DeclaredCard[] {
  const { shows } = useSlotVisibility(sessionWorkbenchSlot.id);

  return useDeclaredItems(sessionWorkbenchSlot).filter(({ pluginId }) =>
    shows(pluginId),
  );
}

const heldCard = (card: DeclaredCard): HeldCard => ({
  cardKey: keyOf(card),
  pluginId: card.pluginId,
  path: card.item.page,
});

type Drawing = Pick<Opening, 'session' | 'store'>;

// A card draws from the page the Session holds, and its full view is the Plugin's own page, drawn for this Session (ADR-0035, ADR-0050).
const drawnCard = (
  card: DeclaredCard,
  { session, store }: Drawing,
): SessionPluginCard => ({
  pluginId: card.pluginId,
  card: card.item,
  page: <HeldCardView store={store} {...heldCard(card)} />,
  tab: card.item.tab && (
    <PluginTabPage pluginId={card.pluginId} path={card.item.tab} {...session} />
  ),
});

// What a header action does to a card on a phone, where there is no column: its sheet is the card's Inspector tab.
export const toggleCardSheet =
  (panels: SessionPanels): ToggleWorkbenchCard =>
  (pluginId, cardId) =>
    panels.toggle(pluginCardKey(pluginId, cardId));
