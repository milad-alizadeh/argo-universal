import { describe, expect, it } from 'vitest';
import type { ConnectionState } from './context';
import { shouldResubscribe } from './should-resubscribe';

const down: ConnectionState[] = ['reconnecting', 'offline'];

describe('shouldResubscribe', () => {
  it.each(down)(
    'restarts a failed subscription when the Connection reopens from %s',
    (previous) => {
      expect(shouldResubscribe(previous, 'open', 'error')).toBe(true);
    },
  );

  it.each(['pending', 'success', 'idle', 'connecting'])(
    'leaves a %s subscription alone when the Connection reopens',
    (status) => {
      expect(shouldResubscribe('reconnecting', 'open', status)).toBe(false);
    },
  );

  it('leaves a failed subscription alone while the Connection stays open', () => {
    expect(shouldResubscribe('open', 'open', 'error')).toBe(false);
  });

  it.each(down)(
    'leaves a failed subscription alone while the Connection is %s',
    (current) => {
      expect(shouldResubscribe('open', current, 'error')).toBe(false);
      expect(shouldResubscribe('reconnecting', current, 'error')).toBe(false);
    },
  );
});
