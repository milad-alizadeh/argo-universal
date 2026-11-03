import {
  type DeclaredItemOf,
  sessionWorkbenchSlot,
} from '@repo/contracts/plugins/declared-slots';
import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  type SessionPanels,
  SessionMemory,
  useSessionMemory,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { HeldCardStore } from './held-card-store';
import {
  type HeldCard,
  HeldCardPage,
  HeldCardViews,
  PluginTabPage,
} from './plugin-card-pages';
import {
  pluginCardKey,
  type SessionPluginCard,
} from './sections/plugin-card-section';
import { useDeclaredItems } from './use-declared-items';
import { useLatest } from './use-latest';
import type { ToggleWorkbenchCard } from './use-plugin-header-actions';

type DeclaredCard = DeclaredItemOf<typeof sessionWorkbenchSlot>;

// Whether a Plugin's card has something to show for this Session.
export type CardFilled = (pluginId: string, cardId: string) => boolean;

// The Session's Plugin cards, and what a header action does to one.
export interface WorkbenchCards {
  // The cards the Session has open, in Slot order, each with the Plugin's pages inside it.
  open: readonly SessionPluginCard[];
  // A card with nothing to show has no header action either.
  filled: CardFilled;
  // Toggles a card in the Workbench column, where there is one.
  toggle: ToggleWorkbenchCard;
  // The views of every declared card's page, which the page mounts once beside the Session.
  held: ReactNode;
  // Hears each card that had something to show and now has nothing.
  whenEmptied: HeldCardStore['whenEmptied'];
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

/*
 * The Plugin cards a Session draws: every card the enabled Plugins declare and this Device shows, once its page draws
 * something, less the ones the user has closed. Each card's page is watched from the moment the Session opens, and
 * a page that draws nothing, or has not answered yet, has no card, no Inspector tab and no header action (ADR-0035).
 */
export function useWorkbenchCards(sessionId: string): WorkbenchCards {
  const declared = useDeclaredWorkbenchCards();
  const [closed, setClosed] = useSessionMemory(closedCards, sessionId);
  const held = useHeldCards(sessionId, declared);

  return {
    open: openCards(declared, { sessionId, closed, ...held }),
    filled: held.filled,
    toggle: (pluginId, cardId) =>
      setClosed((keys) => toggled(keys, pluginCardKey(pluginId, cardId))),
    held: held.views,
    whenEmptied: held.store.whenEmptied,
  };
}

/*
 * A card that empties closes its Inspector tab, or its sheet on a phone, so neither comes back unasked the next time
 * the card has something to show. A card still waiting for its Plugin keeps its tab, as when the Session reopens.
 */
export function useEmptiedCardsClose(
  whenEmptied: WorkbenchCards['whenEmptied'],
  panels: SessionPanels,
): void {
  const close = useLatest(panels.close);

  useEffect(
    () => whenEmptied((key) => close.current(key)),
    [whenEmptied, close],
  );
}

// The Session's card views: the store they are held in, which cards have something to show, and the views to mount.
interface HeldCards {
  store: HeldCardStore;
  filled: CardFilled;
  views: ReactNode;
}

function useHeldCards(
  sessionId: string,
  declared: readonly DeclaredCard[],
): HeldCards {
  const [store] = useState(() => new HeldCardStore());
  const filled = useSyncExternalStore(store.subscribe, store.filled);
  const cards = declared.map(heldCard);

  return {
    store,
    filled: (pluginId, cardId) =>
      filled.includes(pluginCardKey(pluginId, cardId)),
    views: <HeldCardViews store={store} sessionId={sessionId} cards={cards} />,
  };
}

type Opening = Drawing &
  Pick<HeldCards, 'filled'> & { closed: readonly string[] };

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

interface Drawing {
  sessionId: string;
  store: HeldCardStore;
}

// A card draws from the view the Session holds, and its full view is the Plugin's own page, drawn for this Session (ADR-0035).
const drawnCard = (
  card: DeclaredCard,
  { sessionId, store }: Drawing,
): SessionPluginCard => ({
  pluginId: card.pluginId,
  card: card.item,
  page: <HeldCardPage store={store} card={heldCard(card)} />,
  tab: card.item.tab && (
    <PluginTabPage
      pluginId={card.pluginId}
      path={card.item.tab}
      sessionId={sessionId}
    />
  ),
});

// What a header action does to a card on a phone, where there is no column: its sheet is the card's Inspector tab.
export const toggleCardSheet =
  (panels: SessionPanels): ToggleWorkbenchCard =>
  (pluginId, cardId) =>
    panels.toggle(pluginCardKey(pluginId, cardId));
