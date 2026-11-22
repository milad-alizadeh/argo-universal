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
import type { WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';

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

const framed = (text: string): WireNode => ({
  type: 'Surface',
  key: 'draft-state-explanation',
  props: { kind: 'card', padding: 3 },
  children: [
    {
      ...pluginPageFallback,
      props: { ...pluginPageFallback.props, children: text },
    },
  ],
  slots: {},
});

/*
 * What a Draft page draws in place of its tree when it cannot draw the state chosen: the Plugin page's own
 * fallback, saying why (ADR-0057). A state the Draft does not declare is named before any failure the Loader
 * has for it, since the Loader was never meant to answer it.
 */
export function draftFrameOf(
  bar: DraftBarModel | null,
  error: string | null,
): WireNode | null {
  const state = bar?.states.find(({ id }) => id === bar.current);

  if (!bar || !state) return null;

  if (state.missing)
    return framed(
      `The ${state.label} state is not declared in this Draft. Add it to the page's states in plugin.json and answer it in the Loader.`,
    );

  if (error !== null)
    return framed(
      `The Loader could not draw the ${state.label} state: ${error}`,
    );

  return null;
}
