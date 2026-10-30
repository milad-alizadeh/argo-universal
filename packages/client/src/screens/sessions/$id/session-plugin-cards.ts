import type { SessionPanels } from '#features/sessions';
import type { SessionPluginCard } from './sections/plugin-card-section';
import type { SessionItems } from './sections/session-section';
import { offeredSections } from './sections/session-sections';
import type { SessionDetailViewProps } from './session-detail-view';
import type { HeaderCards } from './session-page-header';
import type { WorkbenchCards } from './use-workbench-cards';

// The Inspector's tabs, which a header action opens a card's sheet in; a Session that is not open yet has none.
const panelsOf = (props: SessionDetailViewProps): SessionPanels | undefined =>
  props.state === 'open' ? props.inspectorPanels : undefined;

// What the Session's header needs beyond the page itself: the cards a header action toggles, and where they open.
export const sessionHeader = (
  sessionId: string,
  cards: WorkbenchCards,
  page: SessionDetailViewProps,
): SessionDetailViewProps & HeaderCards => ({
  ...page,
  sessionId,
  cards,
  panels: panelsOf(page),
});

// The Workbench stacks the open Plugin cards after Argo's own, and their Inspector tabs follow (ADR-0035).
export const withPluginCards = (
  props: SessionDetailViewProps,
  pluginCards: readonly SessionPluginCard[],
): SessionDetailViewProps =>
  props.state === 'open' ? { ...props, pluginCards } : props;

// A Plugin card keeps its Inspector tab while the card is open, as a Section keeps its tab while the Session offers it.
export const offeredWith =
  (cards: readonly SessionPluginCard[]) =>
  (work: SessionItems): string[] =>
    offeredSections(work, cards);
