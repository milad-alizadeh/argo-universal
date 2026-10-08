import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { DEFAULT_VALUE, type ConfigValues } from './config-options';
export async function applyValues(
  vendor: Query,
  current: ConfigValues,
  next: ConfigValues,
): Promise<void> {
  await applyModel(vendor, current.model, next.model);
  if (next.mode !== current.mode) await vendor.setPermissionMode(next.mode);
  await applyEffort(vendor, current.effort, next.effort);
}
async function applyEffort(
  vendor: Query,
  current: ConfigValues['effort'],
  next: ConfigValues['effort'],
): Promise<void> {
  if (next !== current)
    await vendor.applyFlagSettings({
      effortLevel: next === DEFAULT_VALUE ? null : next,
    });
}

async function applyModel(
  vendor: Query,
  current: string,
  next: string,
): Promise<void> {
  if (next !== current)
    await vendor.setModel(next === DEFAULT_VALUE ? undefined : next);
}
