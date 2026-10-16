import { fileURLToPath } from 'node:url';
import { checkRuleAllowlists } from './check-rule-allowlists.mts';
import { checkNotYetCleared } from './not-yet-cleared.mts';
import { measureFindings } from './not-yet-cleared/measure.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

// One type-aware oxlint run without every waiver serves both checks; each reads only the rules it waives.
const report = measureFindings(root);

const waivers = checkNotYetCleared(report);

const allowlists = checkRuleAllowlists(report);

process.exitCode = Math.max(waivers, allowlists);
