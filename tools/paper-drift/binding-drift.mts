import type { CopyDrift, LayerDrift } from './drift-model.mts';
import type { StyleChange } from './style-diff.mts';
import { resolveValue, type Tokens } from './token-values.mts';

// Marks changes that keep the value and only swap the token binding, which matter less.
function resolvedOf(
  tokens: Tokens,
  value: string | undefined,
): string | undefined {
  return value === undefined ? undefined : resolveValue(tokens, value);
}

function markChange(tokens: Tokens, change: StyleChange): StyleChange {
  const master = resolvedOf(tokens, change.master);
  const sameValue =
    master !== undefined && master === resolvedOf(tokens, change.copy);
  return { ...change, sameValue };
}

function markLayer(tokens: Tokens, found: LayerDrift): LayerDrift {
  if (!found.changes) return found;
  const changes = found.changes.map((change): StyleChange =>
    markChange(tokens, change),
  );
  return { ...found, changes };
}

export function markBindings(
  tokens: Tokens,
  findings: CopyDrift[],
): CopyDrift[] {
  return findings.map((finding): CopyDrift => ({
    ...finding,
    drift: finding.drift.map((found): LayerDrift => markLayer(tokens, found)),
  }));
}

function changesValue(found: LayerDrift): boolean {
  if (found.problem) return true;
  return (found.changes ?? []).some(
    (change): boolean => change.sameValue !== true,
  );
}

// A finding whose every change keeps the value only lost or swapped a token.
export function bindingOnly(finding: CopyDrift): boolean {
  return !finding.drift.some(changesValue);
}
