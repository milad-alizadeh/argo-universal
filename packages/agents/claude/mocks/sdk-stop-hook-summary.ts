// A failed Stop hook, shaped by the CLI's internal `stop_hook_summary` schema.
export const stopHookSummary = {
  type: 'system',
  subtype: 'stop_hook_summary',
  hook_count: 1,
  hook_infos: [{ command: 'pnpm lint', duration_ms: 812 }],
  hook_errors: ['Command failed with exit code 1'],
  prevented_continuation: false,
  has_output: true,
  level: 'warning',
  hook_label: 'Stop',
  total_duration_ms: 812,
  uuid: 'f3b1c2d4-6a7e-4b8f-9c0d-1e2f3a4b5c6d',
  session_id: '6e478038-0580-40fd-8f8a-63ada82f98ee',
};
