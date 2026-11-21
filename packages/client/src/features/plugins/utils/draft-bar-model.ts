import type { PluginManifest } from '@repo/contracts/plugins';
import {
  draftStateIds,
  draftStateKey,
  draftStateLabels,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import { matchPagePath } from '@repo/contracts/plugins/page-address';

// What the bar needs of a listed Plugin.
export type DraftEntry = {
  dev?: boolean;
  manifest: { contributes: Pick<PluginManifest['contributes'], 'drafts'> };
};

export type DraftBarState = {
  id: DraftStateId;
  label: string;
  // The Draft does not draw this minimum state, which the State menu says.
  missing: boolean;
};

export type DraftBarModel = {
  // Every minimum state in minimum order; wide tabs show only the declared ones.
  states: DraftBarState[];
  current: DraftStateId;
};

// The state a Draft page rests on until one is chosen.
const restingState: DraftStateId = 'populated';

/*
 * The Draft bar a Plugin page shows, or null: only a dev Plugin's Draft page has one, so a shipped Plugin
 * never draws Draft tooling (ADR-0057).
 */
export function draftBarOf(
  entry: DraftEntry | null,
  path: string,
  pageState: PageState,
): DraftBarModel | null {
  const declared = entry?.dev === true ? declaredStates(entry, path) : null;

  if (!declared) return null;

  return {
    states: draftStateIds.map((id) => ({
      id,
      label: draftStateLabels[id],
      missing: !declared.includes(id),
    })),
    current: currentState(declared, pageState),
  };
}

function declaredStates(
  entry: DraftEntry,
  path: string,
): readonly DraftStateId[] | null {
  const draft = entry.manifest.contributes.drafts?.find(
    ({ page }) => matchPagePath(page, path) !== null,
  );

  return draft?.states ?? null;
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
