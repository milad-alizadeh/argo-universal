import type { SessionConfigSelectOption } from '@repo/contracts';
import type { AgentConfigValue } from './agent-events';

export const sharedModes = {
  plan: {
    name: 'Plan mode',
    description: 'Reads and plans, changes nothing',
    _meta: { argo: { icon: 'MapTrifold', tone: 'planning' } },
  },
  default: {
    name: 'Ask first',
    description: 'Asks before edits and commands',
    _meta: { argo: { icon: 'ShieldWarning', tone: 'safe' } },
  },
} satisfies Record<string, Omit<SessionConfigSelectOption, 'value'>>;

export const effortLevelName = (level: string): string =>
  level === 'xhigh'
    ? 'Extra high'
    : `${level.charAt(0).toUpperCase()}${level.slice(1)}`;

export const hasEffortLevels = (levels: readonly unknown[]): boolean =>
  levels.length > 0;

export function changeValue<Values extends object>(
  allowed: (wanted: Record<keyof Values, unknown>) => Values,
  values: Values,
  change: AgentConfigValue,
): Values | undefined {
  if (!Object.hasOwn(values, change.configId)) return undefined;
  const next = allowed({ ...values, [change.configId]: change.value });
  return Object.entries(next).some(
    ([id, value]): boolean => id === change.configId && value === change.value,
  )
    ? next
    : undefined;
}
