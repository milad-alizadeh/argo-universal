import { describe, expect, it } from 'vitest';
import { subagentRole } from './subagent-role';

describe('which role a Subagent row shows', () => {
  it('reads the role the Agent named, in any case', () => {
    expect(subagentRole({ role: 'Explore' }).name).toBe('Explore');
    expect(subagentRole({ role: ' plan ' }).name).toBe('Plan');
    expect(subagentRole({ role: 'REVIEW' }).name).toBe('Review');
    expect(subagentRole({ role: 'test' }).name).toBe('Test');
  });

  it('reads an unknown or missing role as General', () => {
    expect(subagentRole({ role: 'general-purpose' }).name).toBe('General');
    expect(subagentRole({ role: null }).name).toBe('General');
  });
});
