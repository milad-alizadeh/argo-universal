import type { PluginManifest } from '@repo/contracts/plugins';
import {
  currentDraftState,
  draftPageAt,
  draftRegions,
  draftStateIds,
  draftStateLabels,
  missingDraftStates,
  type DraftPage,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';

export type DraftEntry = {
  dev?: boolean;
  manifest: { contributes: Pick<PluginManifest['contributes'], 'drafts'> };
};

export type DraftBarState = {
  id: DraftStateId;
  label: string;
  missing: boolean;
};

export type DraftBarModel = {
  states: DraftBarState[];
  current: DraftStateId;
  regions: string[];
};

// A Draft is drawn in a dev Plugin only; the Server says which Plugins are dev.
export const draftPageOf = (
  entry: DraftEntry | null,
  path: string,
): DraftPage | null =>
  entry?.dev === true
    ? draftPageAt(entry.manifest.contributes.drafts, path)
    : null;

export function draftBarOf(
  entry: DraftEntry | null,
  path: string,
  pageState: PageState,
): DraftBarModel | null {
  const draft = draftPageOf(entry, path);

  if (!draft) return null;

  const missing = missingDraftStates(draft.states);

  return {
    states: draftStateIds.map((id) => ({
      id,
      label: draftStateLabels[id],
      missing: missing.includes(id),
    })),
    current: currentDraftState(draft.states, pageState),
    regions: draftRegions(draft).map(({ id }) => id),
  };
}
