/*
 * The `_claude/rateLimit` claude-agent-acp 0.108.0 sent on a Claude subscription, as captured: the window's
 * used share is only under `unifiedWindows`, never at the top level.
 */
export const capturedClaudeRateLimit = {
  status: 'allowed',
  resetsAt: 1_795_280_400,
  rateLimitType: 'seven_day',
  overageStatus: 'rejected',
  overageDisabledReason: 'org_level_disabled',
  isUsingOverage: false,
  unifiedWindows: {
    seven_day: {
      utilization: 0.44,
      resetsAt: 1_795_280_400,
      status: 'allowed',
    },
  },
};
