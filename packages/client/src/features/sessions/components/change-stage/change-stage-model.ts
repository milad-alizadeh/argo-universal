// The stages a Change moves through, in order; a picker reads its options from here.
export const changeStageNames = [
  'working',
  'branch',
  'open',
  'merged',
  'closed',
] as const;

export type ChangeStageName = (typeof changeStageNames)[number];

export const changeModifierNames = ['draft', 'conflict'] as const;

type ChangeModifier = (typeof changeModifierNames)[number];

/*
 * Draft and conflict describe an Open Change, without replacing its stage. `modifier` is the one a single mark draws;
 * `modifiers` holds every fact that holds, so a draft PR that also conflicts keeps both.
 */
export type ChangeState =
  | {
      stage: 'open';
      modifier?: ChangeModifier;
      modifiers?: readonly ChangeModifier[];
    }
  | {
      stage: Exclude<ChangeStageName, 'open'>;
      modifier?: never;
      modifiers?: never;
    };

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

type ModifierAppearance = (typeof modifiers)[ChangeModifier];

type StageAppearance = (typeof stages)[ChangeStageName] & {
  // The first modifier that holds.
  modifier?: ModifierAppearance;
};

// Every modifier that holds, draft before conflict, whichever way the state names them.
export function changeModifiers(state: ChangeState): ModifierAppearance[] {
  const named = new Set([...(state.modifiers ?? []), state.modifier]);

  return changeModifierNames.flatMap((name) =>
    named.has(name) ? [modifiers[name]] : [],
  );
}

// Shared by every drawing: a modifier never changes the Open stage's glyph or tone.
export function resolveChangeStage(state: ChangeState): StageAppearance {
  const [modifier] = changeModifiers(state);

  return modifier ? { ...stages[state.stage], modifier } : stages[state.stage];
}

export function changeDescription(state: ChangeState): string {
  const { label } = resolveChangeStage(state);

  return [label, ...changeModifiers(state).map((one) => one.label)].join(', ');
}
