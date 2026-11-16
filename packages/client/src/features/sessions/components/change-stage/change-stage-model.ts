import {
  changeMarks,
  type ChangeMarkName,
  type StageMark,
} from '@repo/kit/stage-marks';

// The stages a Change moves through, in order; a picker reads its options from here.
export const changeStageNames = [
  'working',
  'branch',
  'open',
  'merged',
  'closed',
] as const;

export type ChangeStageName = (typeof changeStageNames)[number];

// In the order they win the mark: a draft that also conflicts is marked Draft.
export const changeModifierNames = ['draft', 'conflict'] as const;

type ChangeModifier = (typeof changeModifierNames)[number];

/*
 * Draft and conflict describe an Open Change, without being a Stage of their own. `modifiers` holds every fact that
 * holds, so a draft PR that also conflicts keeps both; the mark shows one, and a draft wins.
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

const named = (state: ChangeState): ReadonlySet<ChangeModifier | undefined> =>
  new Set([...(state.modifiers ?? []), state.modifier]);

// The mark in place of Open's: a draft, else a conflict.
const markName = (state: ChangeState): ChangeMarkName => {
  const modifiers = named(state);

  return changeModifierNames.find((one) => modifiers.has(one)) ?? state.stage;
};

// Shared by every drawing, from the one table every surface marks a Change from.
export function resolveChangeStage(state: ChangeState): StageMark {
  return changeMarks[markName(state)];
}

export function changeDescription(state: ChangeState): string {
  return resolveChangeStage(state).label;
}
