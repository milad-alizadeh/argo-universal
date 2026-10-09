import { readWaivers, type Entry } from './document.mts';
import { countFindings, type Finding, readFindings } from './findings.mts';
import { growthProblems } from './policy.mts';
import { pruneWaivers } from './prune.mts';

interface EntrySummary {
  glob: string;
  findings: number;
  rules: number;
}
export interface Evaluation {
  problems: string[];
  entries: EntrySummary[];
  pruned: string;
}

function staleProblems(entry: Entry, findings: Finding[]): string[] {
  return Object.keys(entry.rules)
    .filter(
      (rule): boolean => countFindings(findings, entry.files[0], rule) === 0,
    )
    .map(
      (rule): string =>
        `${entry.files[0]}: stale rule ${rule}; run node tools/not-yet-cleared.mts prune`,
    );
}

interface WaiverInput {
  current: string;
  baseline: string;
  report: string;
}

function summarizeEntry(entry: Entry, findings: Finding[]): EntrySummary {
  return {
    glob: entry.files[0],
    findings: countFindings(findings, entry.files[0]),
    rules: Object.keys(entry.rules).length,
  };
}

export function evaluateWaivers(input: WaiverInput): Evaluation {
  const entries = readWaivers(input.current);
  const findings = readFindings(input.report);
  return {
    problems: [
      ...growthProblems(entries, readWaivers(input.baseline)),
      ...entries.flatMap((entry): string[] => staleProblems(entry, findings)),
    ],
    entries: entries.map((entry): EntrySummary =>
      summarizeEntry(entry, findings),
    ),
    pruned: pruneWaivers(input.current, entries, findings),
  };
}
