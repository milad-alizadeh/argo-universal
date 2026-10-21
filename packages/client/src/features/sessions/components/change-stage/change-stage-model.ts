export type ChangeStageName =
  | 'working'
  | 'branch'
  | 'open'
  | 'merged'
  | 'closed';

// Draft and conflict describe an Open Change, without replacing its stage.
export type ChangeState =
  | { stage: 'open'; modifier?: 'draft' | 'conflict' }
  | { stage: Exclude<ChangeStageName, 'open'>; modifier?: never };

const stages = {
  working: { label: 'Working', icon: 'pencil', tone: 'neutral' },
  branch: { label: 'Branch', icon: 'branch', tone: 'neutral' },
  open: { label: 'Open', icon: 'pr-open', tone: 'success' },
  merged: { label: 'Merged', icon: 'pr-merged', tone: 'done' },
  closed: { label: 'Closed', icon: 'pr-closed', tone: 'danger' },
} as const;

const modifiers = {
  draft: { label: 'Draft', tone: 'muted' },
  conflict: { label: 'Conflict', tone: 'warning' },
} as const;

type StageAppearance = (typeof stages)[ChangeStageName] & {
  modifier?: (typeof modifiers)[keyof typeof modifiers];
};

// Shared by every drawing: a modifier never changes the Open stage's glyph or tone.
export function resolveChangeStage(state: ChangeState): StageAppearance {
  const appearance = stages[state.stage];

  return state.modifier
    ? { ...appearance, modifier: modifiers[state.modifier] }
    : appearance;
}

export function changeDescription(state: ChangeState): string {
  const appearance = resolveChangeStage(state);

  return appearance.modifier
    ? `${appearance.label}, ${appearance.modifier.label}`
    : appearance.label;
}
