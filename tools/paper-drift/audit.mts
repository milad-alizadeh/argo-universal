import { bindingOnly, markBindings } from './binding-drift.mts';
import { findCopyDrift } from './copy-drift.mts';
import type { CopyDrift } from './drift-model.mts';
import { findLiteralDrift, type LiteralUse } from './literal-drift.mts';
import { findNameDrift, type NameVariant } from './name-drift.mts';
import { checkRegistry, type RegistryHealth } from './registry-health.mts';
import type { Registry } from './registry.mts';
import type { Snapshot } from './snapshot-model.mts';
import type { CodeTokens } from './theme-tokens.mts';
import { findTokenDrift, type TokenDrift } from './token-drift.mts';
import { findVariantDrift } from './variant-drift.mts';

// Everything the audit finds in one snapshot; it reads only and changes nothing.
export interface Audit {
  takenAt: string;
  registry: RegistryHealth;
  copies: CopyDrift[];
  variations: CopyDrift[];
  names: NameVariant[][];
  tokens: TokenDrift;
  literals: LiteralUse[];
}

function structureDrift(
  snapshot: Snapshot,
  registry: Registry,
): Pick<Audit, 'copies' | 'variations'> {
  const { tokens } = snapshot;
  return {
    copies: markBindings(tokens, findCopyDrift(snapshot, registry)),
    variations: markBindings(tokens, findVariantDrift(snapshot, registry)),
  };
}

export function runAudit(
  snapshot: Snapshot,
  registry: Registry,
  code: CodeTokens,
): Audit {
  return {
    takenAt: snapshot.takenAt,
    registry: checkRegistry(snapshot, registry),
    ...structureDrift(snapshot, registry),
    names: findNameDrift(snapshot),
    tokens: findTokenDrift(snapshot.tokens, code),
    literals: findLiteralDrift(snapshot),
  };
}

function driftCount(label: string, findings: CopyDrift[]): string {
  const bindings = findings.filter(bindingOnly).length;
  return `${label}: ${findings.length - bindings} in value, ${bindings} in token bindings only`;
}

export function auditSummary(audit: Audit): string[] {
  const offScale = audit.literals.filter(
    (use): boolean => use.tokens.length === 0,
  );
  return [
    `Registry: ${audit.registry.missing.length} missing, ${audit.registry.renamed.length} renamed, ${audit.registry.unregistered.length} unregistered, ${audit.registry.misnamed.length} misnamed`,
    driftCount('Copies that drifted from their master', audit.copies),
    driftCount('Variations that drifted from their base', audit.variations),
    `Names spelled more than one way: ${audit.names.length}`,
    `Tokens that differ from theme.css: ${audit.tokens.mismatches.length}`,
    `Literal values with a matching token: ${audit.literals.length - offScale.length}; off the scale: ${offScale.length}`,
  ];
}
