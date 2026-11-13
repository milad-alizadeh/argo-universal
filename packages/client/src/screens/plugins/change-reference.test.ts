import { describe, expect, it } from 'vitest';
import { referenceOfChange } from './change-reference';

describe('referenceOfChange', () => {
  it('names a Change by its repository and number, so two repositories never collide', () => {
    expect(referenceOfChange({ repository: 'owner/repo', number: 12 })).toBe(
      'owner/repo#12',
    );
    expect(referenceOfChange({ repository: 'fork/repo', number: 12 })).toBe(
      'fork/repo#12',
    );
  });
});
