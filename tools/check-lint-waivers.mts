import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRuleAllowlists } from './check-rule-allowlists.mts';
import { checkNotYetCleared } from './not-yet-cleared.mts';
import { measureFindings } from './not-yet-cleared/measure.mts';
import { formatFinding, unwaivedFindings } from './unwaived-findings.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const read = (path: string): string => readFileSync(join(root, path), 'utf8');

// One type-aware oxlint run without every waiver serves the lint gate and both waiver checks; each reads only the rules it waives.
const report = measureFindings(root);

const findings = unwaivedFindings(report, {
  notYetCleared: read('tooling/oxlint/not-yet-cleared.json'),
  allowlists: [
    {
      text: read('tooling/oxlint/kit-styling-allowlist.json'),
      rule: 'argo/kit-styling',
    },
  ],
});

for (const finding of findings) console.error(formatFinding(finding));

console.log(`oxlint: ${findings.length} findings outside the waivers`);

const lint = findings.length > 0 ? 1 : 0;

const waivers = checkNotYetCleared(report);

const allowlists = checkRuleAllowlists(report);

process.exitCode = Math.max(lint, waivers, allowlists);
