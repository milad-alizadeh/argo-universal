import { describe, expect, it } from 'vitest';
import { turnEndNotice } from './turn-end-notice';

const end = { error: null, durationMs: 4_000 } as const;

describe('turnEndNotice', () => {
  it('reads a cancelled Turn as the user stopping it', () => {
    expect(turnEndNotice({ ...end, stopReason: 'cancelled' })).toMatchObject({
      title: 'You stopped after 4s',
    });
  });

  it('reads a cancelled Turn after a denied Permission request as a denial', () => {
    expect(
      turnEndNotice({
        ...end,
        stopReason: 'cancelled',
        permissionDenied: true,
      }),
    ).toMatchObject({
      severity: 'info',
      title: 'Turn ended after you denied a Permission request',
    });
  });

  it('reads an error ending as an error', () => {
    expect(
      turnEndNotice({
        stopReason: 'error',
        error: { code: -32603, message: 'Boom' },
        durationMs: 4_000,
      }),
    ).toMatchObject({ severity: 'error', description: 'Boom' });
  });

  it.each([
    ['max_tokens', 'warning'],
    ['max_turn_requests', 'warning'],
    ['refusal', 'info'],
    ['auth_required', 'warning'],
  ] as const)('reads a %s ending as %s', (stopReason, severity) => {
    expect(turnEndNotice({ ...end, stopReason })).toMatchObject({ severity });
  });

  it('reads an error ending without details as an error with no description', () => {
    expect(turnEndNotice({ ...end, stopReason: 'error' })).toMatchObject({
      severity: 'error',
      description: undefined,
    });
  });

  it('draws nothing for a Turn that completed', () => {
    expect(turnEndNotice({ ...end, stopReason: 'end_turn' })).toBeNull();
  });
});
