import { expect, it } from 'vitest';
import { actionUrlReason } from './action-urls';

const sequence = (url: string): Parameters<typeof actionUrlReason>[0] => ({
  action: 'sequence',
  steps: [
    { action: 'copy', text: 'WDJB-MJHT' },
    { action: 'openUrl', url },
  ],
});

it('checks the URL of each step in a sequence', () => {
  expect(actionUrlReason(sequence('https://example.com'))).toBeUndefined();
  expect(actionUrlReason(sequence('javascript:alert(1)'))).toContain(
    'refused javascript:',
  );
});
