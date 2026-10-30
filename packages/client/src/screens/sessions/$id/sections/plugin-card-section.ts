import type { SessionWorkbenchCard } from '@repo/contracts/plugins/declared-slots';
import type { ReactNode } from 'react';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import type { SessionSection } from './session-section';

/*
 * One Plugin's Workbench card as the Session draws it: what the Plugin's manifest declares, and the Plugin's own
 * pages inside it. `page` fills the card and `tab` its full view, which only a card that declares one has.
 */
export interface SessionPluginCard {
  pluginId: string;
  card: SessionWorkbenchCard;
  page: ReactNode;
  tab?: ReactNode;
}

/*
 * A Plugin's card keys its Section by the Plugin and the card, so two Plugins' card ids never meet and neither
 * reaches one of Argo's own keys.
 */
export const pluginCardKey = (pluginId: string, cardId: string): string =>
  `plugin:${pluginId}/${cardId}`;

/*
 * A Plugin's card as a Section (ADR-0039): Argo draws the card, its place in the column and its Inspector tab, and
 * the Plugin draws the pages inside them. A card the Plugin gave no full view stays a card and opens nothing.
 */
export const pluginCardSection = (card: SessionPluginCard): SessionSection => ({
  key: pluginCardKey(card.pluginId, card.card.id),
  title: card.card.title,
  icon: pluginSymbol(card.card.icon),
  // The App draws only the cards the Plugins declare and this Device shows, so one in hand is offered.
  offered: () => true,
  // A Plugin's card counts nothing of Argo's; it is drawn because the Plugin declared it.
  count: () => 1,
  card: (_content, tab) => ({
    summary: card.page,
    onOpen: card.tab ? tab.open : undefined,
  }),
  tab: () => ({ body: card.tab }),
  // A phone has no column: the card's full view, or the card itself, is the sheet.
  phone: () => ({ sheetHeader: undefined, body: card.tab ?? card.page }),
});
