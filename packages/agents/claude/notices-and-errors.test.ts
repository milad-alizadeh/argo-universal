import { expect, it } from 'vitest';
import { mapAll, feedChanges, result, failedResult } from './mocks/mapping';
it('ends a failed Turn with the error', (): void => {
  const { events } = mapAll([
    result({
      subtype: 'success',
      is_error: true,
      terminal_reason: 'api_error',
      result: 'Failed to authenticate',
    }),
    failedResult({
      subtype: 'error_during_execution',
      is_error: true,
      errors: ['The tool runner crashed.'],
    }),
  ]);
  expect(events).toEqual([
    expect.objectContaining({
      stopReason: 'error',
      error: { code: -32603, message: 'Failed to authenticate' },
    }),
    expect.objectContaining({
      stopReason: 'error',
      error: { code: -32603, message: 'The tool runner crashed.' },
    }),
  ]);
});
it('shows a retry as a Notice with its attempt', (): void => {
  const { events } = mapAll([
    {
      type: 'system',
      subtype: 'api_retry',
      attempt: 2,
      max_retries: 5,
      retry_delay_ms: 1000,
      error_status: 529,
      error: 'server_error',
      uuid: '00000000-0000-0000-0000-000000000001',
      session_id: 'vendor-1',
    },
  ]);
  expect(feedChanges(events)).toEqual([
    {
      type: 'upsert',
      update: {
        id: '00000000-0000-0000-0000-000000000001',
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'warning',
        title: 'Retrying (2 of 5)',
        _meta: {
          argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } },
        },
      },
    },
  ]);
});
it('shows local command output as a Notice', (): void => {
  const { events } = mapAll([
    {
      type: 'system',
      subtype: 'local_command_output',
      content: 'Compacted.',
      uuid: '00000000-0000-0000-0000-000000000002',
      session_id: 'vendor-1',
    },
  ]);
  expect(feedChanges(events)).toEqual([
    {
      type: 'upsert',
      update: {
        id: '00000000-0000-0000-0000-000000000002',
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'info',
        title: 'Compacted.',
      },
    },
  ]);
});
