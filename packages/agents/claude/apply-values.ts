import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { DEFAULT_VALUE, type ConfigValues } from './config-options';
type ConfigPort = Pick<
  Query,
  'setModel' | 'setPermissionMode' | 'applyFlagSettings'
>;
export async function applyValues(
  vendor: ConfigPort,
  current: ConfigValues,
  next: ConfigValues,
): Promise<void> {
  await applyModel(vendor, current.model, next.model);
  if (next.mode !== current.mode) await vendor.setPermissionMode(next.mode);
  await applyEffort(vendor, current.effort, next.effort);
}
async function applyEffort(
  vendor: ConfigPort,
  current: ConfigValues['effort'],
  next: ConfigValues['effort'],
): Promise<void> {
  if (next !== current)
    await vendor.applyFlagSettings({
      effortLevel: next === DEFAULT_VALUE ? null : next,
    });
}

async function applyModel(
  vendor: ConfigPort,
  current: string,
  next: string,
): Promise<void> {
  if (next !== current)
    await vendor.setModel(next === DEFAULT_VALUE ? undefined : next);
}
