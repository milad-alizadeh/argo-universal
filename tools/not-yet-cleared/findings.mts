import { dirname } from 'node:path';
import { z } from 'zod';

const reportSchema = z.object({
  diagnostics: z.array(
    z.object({ filename: z.string().min(1), code: z.string().min(1) }),
  ),
});
export interface Finding {
  folder: string;
  rule: string;
}

function ruleName(code: string): string {
  return code
    .replace(/^eslint\(([^()]+)\)$/, '$1')
    .replace(/^react-hooks\(([^()]+)\)$/, 'react/$1')
    .replace(/^([^()]+)\(([^()]+)\)$/, '$1/$2');
}

export function readFindings(text: string): Finding[] {
  return reportSchema
    .parse(JSON.parse(text))
    .diagnostics.map((finding): Finding => ({
      folder: dirname(finding.filename.replaceAll('\\', '/')),
      rule: ruleName(finding.code),
    }));
}

export function countFindings(
  findings: Finding[],
  glob: string,
  rule?: string,
): number {
  const folder = glob.slice(0, -2);
  return findings.filter(
    (finding): boolean =>
      finding.folder === folder &&
      (rule === undefined || finding.rule === rule),
  ).length;
}
