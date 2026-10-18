import type { WireJson } from '@repo/contracts/plugins/wire';

export interface ControlDraft {
  value: WireJson | undefined;
  source: WireJson | undefined;
  baseline: WireJson | undefined;
  previous: ControlDraft | undefined;
  outcome: 'pending' | 'accepted' | 'rejected';
}

export function draftValue(draft: ControlDraft): WireJson | undefined {
  if (draft.outcome !== 'rejected') return draft.value;

  return draft.previous ? draftValue(draft.previous) : draft.baseline;
}

export function pendingDraft(draft: ControlDraft): boolean {
  return retainedDraft(draft)?.outcome === 'pending';
}

export function retainedDraft(
  draft: ControlDraft | undefined,
): ControlDraft | undefined {
  if (draft?.outcome !== 'rejected') return draft;

  return retainedDraft(draft.previous);
}

export function settleDraft(draft: ControlDraft, failed: boolean): void {
  draft.outcome = failed ? 'rejected' : 'accepted';

  if (!failed) draft.previous = undefined;
}
