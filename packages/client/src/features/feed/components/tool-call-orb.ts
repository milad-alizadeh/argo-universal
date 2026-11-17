import type { ToolCallUpdate } from '@repo/contracts';
import type { OrbState } from '@repo/kit/primitives/status/orb';
import { toolCallCategory } from './tool-call-icon';

// Each kind of work moves the Orb its own way, so the live line shows what the Agent does at a glance.
const categoryOrbs = new Map<string, OrbState>([
  ['read', 'searching'],
  ['list', 'searching'],
  ['search', 'searching'],
  ['fetch', 'searching'],
  ['edit', 'composing'],
  ['delete', 'composing'],
  ['move', 'composing'],
  ['execute', 'shaping'],
]);

export function toolCallOrb(row?: ToolCallUpdate): OrbState {
  if (!row) return 'working';

  return categoryOrbs.get(toolCallCategory(row)) ?? 'working';
}
