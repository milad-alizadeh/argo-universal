import type { PluginManifest } from '@repo/contracts/plugins';
import {
  draftStateIds,
  draftStateKey,
  draftStateLabels,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import { matchPagePath } from '@repo/contracts/plugins/page-address';

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

const restingState: DraftStateId = 'populated';

export function draftBarOf(
  entry: DraftEntry | null,
  path: string,
  pageState: PageState,
): DraftBarModel | null {
  const draft = entry?.dev === true ? draftAt(entry, path) : null;
  const declared = draft?.states;

  if (!declared) return null;

  return {
    states: draftStateIds.map((id) => ({
      id,
      label: draftStateLabels[id],
      missing: !declared.includes(id),
    })),
    current: currentState(declared, pageState),
    regions: draft.regions?.map(({ id }) => id) ?? [],
  };
}

function draftAt(
  entry: DraftEntry,
  path: string,
): NonNullable<PluginManifest['contributes']['drafts']>[number] | null {
  return (
    entry.manifest.contributes.drafts?.find(
      ({ page }) => matchPagePath(page, path) !== null,
    ) ?? null
  );
}

function currentState(
  declared: readonly DraftStateId[],
  pageState: PageState,
): DraftStateId {
  const chosen = declared.find((id) => id === pageState[draftStateKey]);

  if (chosen) return chosen;

  if (declared.includes(restingState)) return restingState;

  return draftStateIds.find((id) => declared.includes(id)) ?? restingState;
}
