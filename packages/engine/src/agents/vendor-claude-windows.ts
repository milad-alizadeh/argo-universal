import { z } from 'zod';
import type { LimitName } from './vendor-usage-reading';

const weekly = 'week';

export const claudeWindows = {
  five_hour: { id: 'five_hour', label: '5-hour limit', window: 'five_hour' },
  seven_day: { id: 'seven_day', label: 'Weekly limit', window: weekly },
  seven_day_opus: {
    id: 'seven_day_opus',
    label: 'Weekly Opus limit',
    model: 'opus',
    window: weekly,
  },
  seven_day_sonnet: {
    id: 'seven_day_sonnet',
    label: 'Weekly Sonnet limit',
    model: 'sonnet',
    window: weekly,
  },
  seven_day_oauth_apps: {
    id: 'seven_day_oauth_apps',
    label: 'Weekly third-party app limit',
    window: weekly,
  },
  seven_day_cowork: {
    id: 'seven_day_cowork',
    label: 'Weekly Cowork limit',
    window: weekly,
  },
} as const satisfies Record<string, LimitName>;

const knownModels = new Map<string, LimitName>([
  ['opus', claudeWindows.seven_day_opus],
  ['sonnet', claudeWindows.seven_day_sonnet],
]);

export function weeklyModel(label: string): LimitName {
  const model = label.toLowerCase();

  return (
    knownModels.get(model) ?? {
      id: 'weekly_scoped',
      label: `Weekly ${label} limit`,
      model,
      window: weekly,
    }
  );
}

const knownGroups = new Map<string, LimitName>([
  ['session', claudeWindows.five_hour],
  ['weekly', claudeWindows.seven_day],
  ['monthly', { id: 'monthly', label: 'Monthly limit', window: 'month' }],
]);

const DisplayName = z
  .object({ display_name: z.string().trim().min(1) })
  .nullish();

export const ClaudeScope = z
  .object({
    model: DisplayName,
    surface: DisplayName,
  })
  .nullish();

type Scope = z.infer<typeof ClaudeScope>;

function scopeLabel(scope: Scope): string | undefined {
  if (!scope) return;

  return displayName(scope.model) ?? displayName(scope.surface);
}

const displayName = (name: z.infer<typeof DisplayName>): string | undefined =>
  name?.display_name;

function scopedName(base: LimitName, scope: Scope): LimitName {
  const label = scopeLabel(scope);

  return label ? namedScope(base, label) : base;
}

function namedScope(base: LimitName, label: string): LimitName {
  return base.window === weekly
    ? weeklyModel(label)
    : {
        ...base,
        id: `${base.id}:scoped`,
        label: `${label} ${base.label.toLowerCase()}`,
        model: label.toLowerCase(),
      };
}

export function claudeWindowName(
  group: string,
  kind: string,
  scope: Scope,
): LimitName {
  const base = knownGroups.get(group) ?? {
    id: kind,
    label: 'Usage limit',
    window: 'other',
  };

  return scopedName(base, scope);
}
