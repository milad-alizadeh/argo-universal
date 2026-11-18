import { expect, it } from 'vitest';
import { codexUsageBucketId } from './vendor';
import { claudeAccountUsage } from './vendor-claude-account-usage';
import { codexAccountUsage } from './vendor-codex-account-usage';

const observedAt = '2026-11-18T10:00:00.000Z';

const resets = '2026-11-21T17:00:01.001686+00:00';

it('reads Claude’s all-model and scoped weekly limits without inventing a 5-hour reading', () => {
  const limits = claudeAccountUsage(
    {
      rate_limits: {
        five_hour: null,
        seven_day: { utilization: 54, resets_at: resets },
        model_scoped: [
          { display_name: 'Fable', utilization: 36, resets_at: resets },
        ],
        extra_usage: { is_enabled: true, utilization: 10 },
      },
    },
    observedAt,
  );

  expect(limits).toMatchObject([
    {
      id: 'seven_day',
      window: 'week',
      measure: { used: 0.54 },
      resetsAt: '2026-11-21T17:00:01.001Z',
    },
    { label: 'Weekly Fable limit', window: 'week', measure: { used: 0.36 } },
    { label: 'Monthly extra usage', window: 'month', measure: { used: 0.1 } },
  ]);
  expect(limits?.[2]).not.toHaveProperty('resetsAt');
});

it('reads Codex duration and model buckets from the snapshot map without duplicating the default', () => {
  const primary = {
    usedPercent: 40,
    windowDurationMins: 300,
    resetsAt: 1795280400,
  };

  const codex = {
    limitId: codexUsageBucketId,
    primary,
    secondary: {
      usedPercent: 66,
      windowDurationMins: 10080,
      resetsAt: 1795512362,
    },
  };

  expect(
    codexAccountUsage(
      {
        rateLimits: codex,
        rateLimitsByLimitId: {
          codex,
          spark: {
            limitName: 'Spark',
            primary: {
              usedPercent: 5,
              windowDurationMins: 43200,
              resetsAt: null,
            },
          },
        },
      },
      observedAt,
      codexUsageBucketId,
    ),
  ).toMatchObject([
    { label: '5-hour limit', window: 'five_hour', measure: { used: 0.4 } },
    { label: 'Weekly limit', window: 'week', measure: { used: 0.66 } },
    { label: 'Spark monthly limit', window: 'month', measure: { used: 0.05 } },
  ]);
});

it('reads a provider-supplied scoped window even without its legacy alias', () => {
  expect(
    claudeAccountUsage(
      {
        rate_limits: {
          limits: [
            {
              kind: 'weekly_scoped',
              group: 'weekly',
              percent: 36,
              resets_at: resets,
              scope: { model: { display_name: 'Fable' } },
              is_active: false,
            },
          ],
        },
      },
      observedAt,
    ),
  ).toMatchObject([
    { label: 'Weekly Fable limit', window: 'week', measure: { used: 0.36 } },
  ]);
});
