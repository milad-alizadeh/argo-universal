import { describe, expect, it } from 'vitest';
import { sessionSlotContext } from './use-session-slot-context';

const nothing = undefined;

describe('sessionSlotContext', () => {
  it('has none until the Project is known', () => {
    expect(sessionSlotContext('s1', nothing)).toBeUndefined();
  });

  it('names the Session and its Project', () => {
    expect(sessionSlotContext('s1', 'p1')).toEqual({
      sessionId: 's1',
      projectId: 'p1',
    });
  });
});
