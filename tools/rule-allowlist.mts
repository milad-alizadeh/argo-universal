import { z } from 'zod';
import { parseJsonc } from './parse-jsonc.mts';

// A shrinking allowlist: one override that turns one argo rule off for the files not yet moved over.
const allowlistSchema = z.strictObject({
  $schema: z.string().optional(),
  overrides: z.tuple([
    z.strictObject({
      files: z.array(z.string()),
      rules: z.record(z.string(), z.literal('off')),
    }),
  ]),
});

export function readAllowlist(text: string, rule: string): string[] {
  const [override] = parseJsonc(allowlistSchema, text).overrides;

  if (Object.keys(override.rules).join(' ') !== rule)
    throw new Error(`The allowlist must waive ${rule} and nothing else.`);

  return override.files;
}

export interface AllowlistState {
  rule: string;
  current: string[];
  // The list at the merge base with main; undefined until the list lands there.
  baseline: string[] | undefined;
  // Files with findings for the rule when the allowlist is left out.
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
        `${file}: no ${state.rule} findings; delete it from the allowlist.`,
    );

  return [...added, ...stale];
}
