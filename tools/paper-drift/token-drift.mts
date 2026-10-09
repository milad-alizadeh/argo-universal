import type { CodeTokens } from './theme-tokens.mts';
import { resolveTokens, type Tokens } from './token-values.mts';

// Paper's tokens against the code's, compared after both are resolved.
export interface TokenMismatch {
  name: string;
  paper: string;
  code: string | undefined;
}

export interface TokenDrift {
  mismatches: TokenMismatch[];
  missingInPaper: string[];
}

const HEX8 = /^#[\dA-F]{8}$/;
// Colours converted from oklch may round one step apart per channel.
const CHANNEL_TOLERANCE = 1;
const CHANNELS = [1, 3, 5, 7];

function channelsOf(hex: string): number[] {
  return CHANNELS.map((at): number =>
    Number.parseInt(hex.slice(at, at + 2), 16),
  );
}

function closeColours(a: string, b: string): boolean {
  if (!HEX8.test(a) || !HEX8.test(b)) return false;
  const other = channelsOf(b);
  return channelsOf(a).every(
    (channel, at): boolean =>
      Math.abs(channel - (other[at] ?? 0)) <= CHANNEL_TOLERANCE,
  );
}

export function sameValue(a: string, b: string | undefined): boolean {
  if (b === undefined) return false;
  return a === b || closeColours(a, b);
}

function mismatchOf(
  code: Tokens,
  [name, paper]: [string, string],
): TokenMismatch[] {
  if (sameValue(paper, code[name])) return [];
  return [{ name, paper, code: code[name] }];
}

export function findTokenDrift(paper: Tokens, code: CodeTokens): TokenDrift {
  const resolvedCode = resolveTokens(code.all);
  return {
    mismatches: Object.entries(resolveTokens(paper))
      .toSorted(([a], [b]): number => a.localeCompare(b))
      .flatMap((entry): TokenMismatch[] => mismatchOf(resolvedCode, entry)),
    missingInPaper: Object.keys(code.own)
      .filter((name): boolean => paper[name] === undefined)
      .toSorted(),
  };
}
