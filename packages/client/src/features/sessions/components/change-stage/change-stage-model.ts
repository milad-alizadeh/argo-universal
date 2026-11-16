import { changeMarks, type ChangeMarkName } from '@repo/kit/stage-marks';

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
 * Draft and conflict describe an Open Change, without replacing its stage. `modifiers` holds every fact that holds,
 * so a draft PR that also conflicts keeps both: the draft is its mark, and the conflict is written beside it.
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

// What is written beside a mark: a conflict blocks an Open Change without changing where it has got to.
const conflict = { label: 'Conflict', tone: 'warning' } as const;

type ModifierAppearance = typeof conflict;

type StageAppearance = (typeof changeMarks)[ChangeMarkName] & {
  modifier?: ModifierAppearance;
};

const named = (state: ChangeState): ReadonlySet<ChangeModifier | undefined> =>
  new Set([...(state.modifiers ?? []), state.modifier]);

// What is written beside the mark. A draft is not: it has a mark of its own.
export function changeModifiers(state: ChangeState): ModifierAppearance[] {
  return named(state).has('conflict') ? [conflict] : [];
}

const markName = (state: ChangeState): ChangeMarkName =>
  named(state).has('draft') ? 'draft' : state.stage;

// Shared by every drawing, from the one table every surface marks a Change from.
export function resolveChangeStage(state: ChangeState): StageAppearance {
  const [modifier] = changeModifiers(state);
  const mark = changeMarks[markName(state)];

  return modifier ? { ...mark, modifier } : mark;
}

export function changeDescription(state: ChangeState): string {
  const { label } = resolveChangeStage(state);

  return [label, ...changeModifiers(state).map((one) => one.label)].join(', ');
}
