import { auditSummary, type Audit } from './audit.mts';
import { driftSection } from './drift-report.mts';
import type { LiteralUse } from './literal-drift.mts';
import type { NameVariant } from './name-drift.mts';
import type { Snapshot } from './snapshot-model.mts';
import type { TokenMismatch } from './token-drift.mts';

// The audit as Markdown, written to .paper-drift/audit.md.
function listOrNone(lines: string[]): string[] {
  return lines.length === 0 ? ['None.'] : lines;
}

function section(title: string, lines: string[]): string[] {
  return [`## ${title}`, '', ...listOrNone(lines), ''];
}

function registryLines(audit: Audit): string[] {
  const { missing, renamed, unregistered, misnamed } = audit.registry;
  return [
    ...missing.map((name): string => `- Missing from the file: ${name}`),
    ...renamed.map(
      (entry): string => `- Renamed: ${entry.name} is now "${entry.now}"`,
    ),
    ...unregistered.map(
      (name): string => `- Presented on a card but not registered: ${name}`,
    ),
    ...misnamed.map(
      (name): string => `- Breaks CodeName (phone) / State: ${name}`,
    ),
  ];
}

function variantText(variant: NameVariant): string {
  return `"${variant.name}" ×${variant.count}`;
}

function nameLine(group: NameVariant[]): string {
  return `- ${group.map(variantText).join(', ')}`;
}

function tokenLine(mismatch: TokenMismatch): string {
  const code = mismatch.code ?? 'not in theme.css';
  return `- \`${mismatch.name}\`: Paper \`${mismatch.paper}\`, code \`${code}\``;
}

function literalLine(use: LiteralUse): string {
  const fix =
    use.tokens.length > 0 ? `use ${use.tokens.join(' or ')}` : 'off the scale';
  return `- ${use.property} \`${use.value}\` ×${use.count}: ${fix} (e.g. ${use.examples[0] ?? ''})`;
}

function tokenLines(audit: Audit): string[] {
  const missing = audit.tokens.missingInPaper;
  const tail =
    missing.length > 0
      ? [`- In theme.css but not in Paper: ${missing.join(', ')}`]
      : [];
  return [...audit.tokens.mismatches.map(tokenLine), ...tail];
}

function iconLines(audit: Audit): string[] {
  const { unknown, unlisted } = audit.icons;
  return [
    ...unknown.map(
      (icon): string =>
        `- Not an app icon: "Icon / ${icon.name}" ×${icon.count}`,
    ),
    ...unlisted.map((name): string => `- Missing from the library: ${name}`),
  ];
}

function headerLines(audit: Audit): string[] {
  return [
    '# Paper drift audit',
    '',
    `Snapshot taken ${audit.takenAt}.`,
    '',
    ...auditSummary(audit).map((line): string => `- ${line}`),
    '',
  ];
}

export function auditReport(snapshot: Snapshot, audit: Audit): string {
  return [
    ...headerLines(audit),
    ...section('Registry', registryLines(audit)),
    ...driftSection(snapshot, 'Copies', audit.copies),
    ...driftSection(snapshot, 'Variations', audit.variations),
    ...section('Names', audit.names.map(nameLine)),
    ...section('Tokens', tokenLines(audit)),
    ...section('Literal values', audit.literals.map(literalLine)),
    ...section('Icons', iconLines(audit)),
  ].join('\n');
}
