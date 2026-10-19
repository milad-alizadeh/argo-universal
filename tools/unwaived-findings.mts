import { dirname } from 'node:path';
import { z } from 'zod';
import { readWaivers } from './not-yet-cleared/document.mts';
import { ruleName } from './not-yet-cleared/findings.mts';
import { readAllowlist } from './rule-allowlist.mts';

const diagnosticSchema = z.object({
  filename: z.string().min(1),
  code: z.string().min(1),
  message: z.string(),
  severity: z.string(),
  help: z.string().optional(),
  labels: z
    .array(
      z.object({ span: z.object({ line: z.number(), column: z.number() }) }),
    )
    .default([]),
});

const reportSchema = z.object({ diagnostics: z.array(diagnosticSchema) });

export type Diagnostic = z.infer<typeof diagnosticSchema>;

export interface WaiverSources {
  // tooling/oxlint/not-yet-cleared.json: `<folder>/*` entries for the files directly in one folder.
  notYetCleared: string;
  allowlists: { text: string; rule: string }[];
}

// Folder or file -> the rules its waivers turn off, mirroring the overrides oxlint applies.
interface Waived {
  folders: Map<string, Set<string>>;
  files: Map<string, Set<string>>;
}

const folderRules = (text: string): Map<string, Set<string>> =>
  new Map(
    readWaivers(text).map((entry): [string, Set<string>] => [
      entry.files[0].slice(0, -2),
      new Set(Object.keys(entry.rules)),
    ]),
  );

const allowlistRules = (
  allowlists: WaiverSources['allowlists'],
): [string, string][] =>
  allowlists.flatMap(({ text, rule }): [string, string][] =>
    readAllowlist(text, rule).map((file): [string, string] => [file, rule]),
  );

function fileRules(
  allowlists: WaiverSources['allowlists'],
): Map<string, Set<string>> {
  const files = new Map<string, Set<string>>();

  for (const [file, rule] of allowlistRules(allowlists))
    files.set(file, new Set([...(files.get(file) ?? []), rule]));

  return files;
}

const waivedRules = (sources: WaiverSources): Waived => ({
  folders: folderRules(sources.notYetCleared),
  files: fileRules(sources.allowlists),
});

const turnsOff = (
  rules: Map<string, Set<string>>,
  path: string,
  rule: string,
): boolean => rules.get(path)?.has(rule) ?? false;

function isWaived(waived: Waived, diagnostic: Diagnostic): boolean {
  const filename = diagnostic.filename.replaceAll('\\', '/');
  const rule = ruleName(diagnostic.code);

  return (
    turnsOff(waived.folders, dirname(filename), rule) ||
    turnsOff(waived.files, filename, rule)
  );
}

// The findings the full config reports: a run without the waivers, less what the waivers turn off.
export function unwaivedFindings(
  report: string,
  sources: WaiverSources,
): Diagnostic[] {
  const waived = waivedRules(sources);

  return reportSchema
    .parse(JSON.parse(report))
    .diagnostics.filter((diagnostic): boolean => !isWaived(waived, diagnostic));
}

// oxlint's first label marks the finding.
const location = ({ labels }: Diagnostic): string =>
  labels
    .slice(0, 1)
    .map(({ span }): string => `:${span.line}:${span.column}`)
    .join('');

const help = (diagnostic: Diagnostic): string =>
  diagnostic.help === undefined ? '' : `\n  help: ${diagnostic.help}`;

export const formatFinding = (diagnostic: Diagnostic): string =>
  `${diagnostic.filename}${location(diagnostic)}: ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}${help(diagnostic)}`;
