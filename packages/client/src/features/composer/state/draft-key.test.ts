import { describe, expect, it } from 'vitest';
import { type DraftOwner, draftKey } from './draft-key';

describe('draftKey', () => {
  it.each<[string, DraftOwner, string]>([
    [
      'a Session by its id',
      { type: 'session', sessionId: 'session-1' },
      'composer-draft:session:session-1',
    ],
    [
      'New Session by its Project',
      { type: 'new-session', projectId: 'project-1' },
      'composer-draft:new-session:project-1',
    ],
  ])('keys the draft of %s', (_, owner, key) => {
    expect(draftKey(owner)).toBe(key);
  });

  it('keeps a Session draft apart from a New Session draft with the same id', () => {
    expect(draftKey({ type: 'session', sessionId: 'same' })).not.toBe(
      draftKey({ type: 'new-session', projectId: 'same' }),
    );
  });
});
