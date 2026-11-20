import { SubagentRole } from '@repo/contracts';
import { expect, it } from 'vitest';
import { subagentMarkLabel, subagentRoleMark } from './subagent-role';

it('names a mark after its role', () => {
  expect(subagentMarkLabel('Implement')).toBe('Implement Agent');
});

it('draws every role an Agent can declare in a tone of its own', () => {
  const tones = SubagentRole.options.map((role) => subagentRoleMark(role).tone);

  expect(new Set(tones).size).toBe(SubagentRole.options.length);
  expect(tones).not.toContain('neutral');
});

it.each([
  ['Explore', 'binoculars'],
  ['general-purpose', 'sparkle'],
  [' Review ', 'search'],
])('matches the role %j whatever its case', (role, icon) => {
  expect(subagentRoleMark(role).icon).toBe(icon);
});

it.each([[null], ['Reticulate']])(
  'draws the General mark for the role %j',
  (role) => {
    expect(subagentRoleMark(role)).toEqual(subagentRoleMark('general'));
  },
);
