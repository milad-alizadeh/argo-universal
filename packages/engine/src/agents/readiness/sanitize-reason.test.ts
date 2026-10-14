import { expect, it } from 'vitest';
import { sanitizeReason } from './sanitize-reason';

it.each([
  [
    'Agent failed: Authorization: Bearer abc.def-123',
    'Agent failed: Authorization: [redacted]',
  ],
  [
    'spawn failed with OPENAI_API_KEY=sk-live-1234567890abcdef',
    'spawn failed with OPENAI_API_KEY=[redacted]',
  ],
  [
    'request to https://me:hunter2@example.org/v1 failed',
    'request to https://[redacted]@example.org/v1 failed',
  ],
  [
    'callback https://example.org/cb?access_token=xyz&state=1 refused',
    'callback https://example.org/cb?access_token=[redacted]&state=1 refused',
  ],
  [
    'token ghp_abcdefghijklmnopqrstuvwxyz0123456789 was rejected',
    'token [redacted] was rejected',
  ],
  ['"password": "s3cret!"', '"password": [redacted]'],
])('a reason never shows a credential: %s', (raw, shown) => {
  expect(sanitizeReason(raw)).toBe(shown);
});

it('a reason drops terminal control sequences and stays one short line', () => {
  const reason = sanitizeReason(
    `\u001b[31mfailed\u001b[0m\n\tat line 1\n${'x'.repeat(600)}`,
  );
  expect(reason.startsWith('failed at line 1 x')).toBe(true);
  expect(reason.length).toBeLessThanOrEqual(300);
  expect(reason.split('').every((char) => char >= ' ')).toBe(true);
});
