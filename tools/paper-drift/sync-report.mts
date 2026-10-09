import type { Blocked, SyncPlan, SyncPlans } from './sync-model.mts';

// The dry run: what a sync would change, and which copies need a person first.
function propertyText([property, value]: [string, string | number]): string {
  return `${property} ${value}`;
}

function placementText(plan: SyncPlan): string {
  const entries = Object.entries(plan.placement);
  if (entries.length === 0) return '';
  return `; placement ${entries.map(propertyText).join(', ')}`;
}

function planLine(plan: SyncPlan): string {
  const kept = `${plan.texts.length} texts, ${plan.display.length} hidden or shown layers, ${plan.kept.length} nested masters`;
  return `- ${plan.copyPath}: fixes ${plan.fixes} styles; keeps ${kept}${placementText(plan)}`;
}

function blockedLine(blocked: Blocked): string {
  return `- ${blocked.copyPath}: ${blocked.reason}`;
}

export function syncReport(name: string, found: SyncPlans): string[] {
  return [
    `${name}: ${found.plans.length} copies to sync, ${found.blocked.length} need a person first`,
    ...found.plans.map(planLine),
    ...(found.blocked.length > 0
      ? ['Their layers differ from the master, so a sync would lose them:']
      : []),
    ...found.blocked.map(blockedLine),
  ];
}
