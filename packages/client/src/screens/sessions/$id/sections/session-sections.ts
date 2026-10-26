import type {
  SessionPanels,
  SessionWorkbench,
  WorkbenchSection,
} from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import { agentsSection } from './agents-section';
import { changesSection } from './changes-section';
import {
  drawsCard,
  itemsOf,
  offeredKeys,
  type SectionTabHandle,
  type SessionItems,
  type SessionSection,
} from './session-section';
import { shellsSection } from './shells-section';

// A Session's Sections, in the order the Workbench stacks them by default.
export const sessionSections: readonly SessionSection[] = [
  changesSection,
  agentsSection,
  shellsSection,
];

export const offeredSections = (items: SessionItems): string[] =>
  offeredKeys(sessionSections, items);

export const sectionOf = (key: string): SessionSection | undefined =>
  sessionSections.find((section) => section.key === key);

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
  const [first] = offeredSections(itemsOf(content));

  return () => first && panels.select(first);
}

export const sessionWorkbench = (
  content: SessionInspectorContent,
  panels: SessionPanels,
): SessionWorkbench => ({
  sections: sessionSections.flatMap((section) =>
    workbenchCard(content, panels, section),
  ),
  onOpenInspector: openFirst(content, panels),
});
