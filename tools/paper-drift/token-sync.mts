import type { PaperPort } from './paper-port.mts';
import { createTokens, setTokenValues } from './paper-writes.mts';
import type { TokenPlan } from './token-plan.mts';

// What `paper:tokens` prints and writes: theme.css's tokens into Paper, Paper-only ones left alone.
function countsOf(plan: TokenPlan): string {
  return [
    `${plan.add.length} to add`,
    `${plan.change.length} to change`,
    `${plan.unchanged.length} unchanged`,
    `${plan.paperOnly.length} only in Paper, left alone`,
    `${plan.unmapped.length} unmapped`,
  ].join(', ');
}

export function tokenReport(plan: TokenPlan): string[] {
  return [
    ...plan.add.map((t) => `Add ${t.name} (${t.type}): ${t.value}`),
    ...plan.change.map((t) => `Change ${t.name}: ${t.paper} → ${t.value}`),
    ...plan.unmapped.map((t) => `Unmapped ${t.name}: ${t.value} (${t.reason})`),
    `Only in Paper: ${plan.paperOnly.join(', ')}`,
    `Tokens: ${countsOf(plan)}.`,
  ];
}

// Adds first, so a changed token may alias one this run creates.
export async function applyTokens(
  paper: PaperPort,
  plan: TokenPlan,
): Promise<string[]> {
  const refused = await createTokens(paper, plan.add);
  const values = plan.change.map(({ name, value }) => ({ name, value }));
  return [...refused, ...(await setTokenValues(paper, values))];
}
