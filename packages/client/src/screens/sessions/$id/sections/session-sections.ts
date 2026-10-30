import type {
  SessionPanels,
  SessionWorkbench,
  WorkbenchSection,
} from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import { agentsSection } from './agents-section';
import { changesSection } from './changes-section';
import {
  pluginCardKey,
  pluginCardSection,
  type SessionPluginCard,
} from './plugin-card-section';
import {
  drawsCard,
  itemsOf,
  offeredKeys,
  type SectionTabHandle,
  type SessionItems,
  type SessionSection,
} from './session-section';
import { shellsSection } from './shells-section';

// Argo's own Sections, in the order the Workbench stacks them by default.
const argoSections: readonly SessionSection[] = [
  changesSection,
  agentsSection,
  shellsSection,
];

// All a Section list needs of a Session: the Plugin cards it has open. The Sections read the rest when they draw.
type SessionCards = Pick<SessionInspectorContent, 'pluginCards'>;

const openCards = (content: SessionCards): readonly SessionPluginCard[] =>
  content.pluginCards ?? [];

// A Session's Sections: Argo's own, then one for each open Plugin card, which the Workbench stacks after them (ADR-0035).
export const sessionSections = (
  content: SessionCards,
): readonly SessionSection[] => [
  ...argoSections,
  ...openCards(content).map(pluginCardSection),
];

/*
 * The Sections a Session offers Inspector tabs: Argo's, by what its work holds, and the Plugin cards it has open. A
 * card that closes takes its tab with it.
 */
export const offeredSections = (
  items: SessionItems,
  cards: readonly SessionPluginCard[] = [],
): string[] => [
  ...offeredKeys(argoSections, items),
  ...cards.map((card) => pluginCardKey(card.pluginId, card.card.id)),
];

export const sectionOf = (
  content: SessionCards,
  key: string,
): SessionSection | undefined =>
  sessionSections(content).find((section) => section.key === key);

export const sectionTab = (
  panels: SessionPanels,
  key: string,
): SectionTabHandle => ({
  open: () => panels.select(key),
  request: () => panels.request(key),
  requested: panels.state.requests?.[key],
});

// A Section's Workbench card, or none while it has nothing to count.
const workbenchCard = (
  content: SessionInspectorContent,
  panels: SessionPanels,
  section: SessionSection,
): WorkbenchSection[] =>
  drawsCard(section, content)
    ? [
        {
          key: section.key,
          title: section.title,
          ...section.card(content, sectionTab(panels, section.key)),
        },
      ]
    : [];

// The band's Inspector button opens the first Section the Session offers.
function openFirst(
  content: SessionInspectorContent,
  panels: SessionPanels,
): () => void {
  const [first] = offeredSections(itemsOf(content), openCards(content));

  return () => first && panels.select(first);
}

export const sessionWorkbench = (
  content: SessionInspectorContent,
  panels: SessionPanels,
): SessionWorkbench => ({
  sections: sessionSections(content).flatMap((section) =>
    workbenchCard(content, panels, section),
  ),
  onOpenInspector: openFirst(content, panels),
});
