import type { SessionInfo } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import {
  SessionWorkbenchColumn,
  useSessionPanels,
  type WorkbenchSection,
} from '#features/sessions';
import type { SlotVisibility } from '#features/settings';
import type { SessionPluginCard } from '../../../../sessions/$id/sections/plugin-card-section';
import { sessionWorkbench } from '../../../../sessions/$id/sections/session-sections';
import { useWorkbenchCards } from '../../../../sessions/$id/use-workbench-cards';
import { useLatestSession } from './session-row-preview';
import type { SlotPreviewProps } from './slot-detail';

export const noWorkbenchCards =
  'No Plugin left on adds a card to the Workbench.';

export const noSessionToPreview =
  'The preview shows a Session’s Workbench, and there is no Session yet.';

/*
 * The Workbench column's own cards for these Plugins, drawn the way a Session draws them: Argo's cards belong to a
 * Session's work, so a preview with nothing but Plugin cards shows exactly what this page's switches leave.
 */
export function WorkbenchCardsPreview({
  cards,
  visibility: { shows },
}: {
  cards: readonly SessionPluginCard[];
  visibility: SlotVisibility;
}): React.JSX.Element {
  const sections = usePreviewSections(
    cards.filter((card) => shows(card.pluginId)),
  );

  if (!sections.length) return <Text role="secondary">{noWorkbenchCards}</Text>;

  return <SessionWorkbenchColumn sections={sections} />;
}

// Nothing is offered here, so the Inspector a card would open stays closed and the preview shows the cards alone.
function usePreviewSections(
  cards: readonly SessionPluginCard[],
): readonly WorkbenchSection[] {
  const panels = useSessionPanels([]);

  return sessionWorkbench({ pluginCards: cards }, panels).sections;
}

// The Session the preview draws for; the cards hook asks for none while there is no Session.
const sessionIdOf = (latest: SessionInfo | undefined): string =>
  latest?.sessionId ?? '';

// The preview on the App: the cards the Server's Plugins declare, drawn for the latest Session.
export function LiveWorkbenchPreview({
  visibility,
}: SlotPreviewProps): React.JSX.Element {
  const latest = useLatestSession();
  const { open } = useWorkbenchCards(sessionIdOf(latest));

  if (!latest) return <Text role="secondary">{noSessionToPreview}</Text>;

  return <WorkbenchCardsPreview cards={open} visibility={visibility} />;
}
