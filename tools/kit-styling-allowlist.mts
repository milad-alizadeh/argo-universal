import { z } from 'zod';
import { parseJsonc } from './not-yet-cleared/document.mts';

const allowlistSchema = z.strictObject({
  $schema: z.string().optional(),
  overrides: z.tuple([
    z.strictObject({
      files: z.array(z.string()),
      rules: z.strictObject({ 'argo/kit-styling': z.literal('off') }),
    }),
  ]),
});

export const readAllowlist = (text: string): string[] =>
  parseJsonc(allowlistSchema, text).overrides[0].files;

export interface AllowlistState {
  current: string[];
  // The list at the merge base with main; undefined until the list lands there.
  baseline: string[] | undefined;
  // Files with argo/kit-styling findings when the allowlist is left out.
  flagged: Set<string>;
  // Files git moved since the baseline, new path to old: a moved file keeps its waiver.
  moved?: Map<string, string>;
}

const pathAtBaseline = (state: AllowlistState, file: string): string =>
  state.moved?.get(file) ?? file;

const addedFiles = (state: AllowlistState): string[] =>
  state.baseline === undefined
    ? []
    : state.current.filter(
        (file): boolean =>
          !state.baseline?.includes(pathAtBaseline(state, file)),
      );

export function allowlistProblems(state: AllowlistState): string[] {
  const added = addedFiles(state).map(
    (file): string => `${file}: added; the allowlist only shrinks.`,
  );

  const stale = state.current
    .filter((file): boolean => !state.flagged.has(file))
    .map(
      (file): string =>
        `${file}: no argo/kit-styling findings; delete it from the allowlist.`,
    );

  return [...added, ...stale];
}
