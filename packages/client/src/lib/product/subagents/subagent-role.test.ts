import { describe, expect, it } from 'vitest';
import { subagentMarkLabel, subagentRoleMark } from './subagent-role';

const marks = {
  explore: { icon: 'binoculars', tone: 'info' },
  general: { icon: 'sparkle', tone: 'neutral' },
  plan: { icon: 'plan-mode', tone: 'done' },
  review: { icon: 'search', tone: 'warning' },
  test: { icon: 'flask', tone: 'success' },
};

describe('subagentRoleMark', () => {
  it('draws the Review mark for a reviewer that reports no role', () => {
    const agent = { role: null, title: 'Follow up spec review' };

    expect(subagentRoleMark(agent)).toEqual(marks.review);
    expect(subagentMarkLabel(agent)).toBe('Review Agent');
  });

  it('draws the role an Agent reports over the one its title names', () => {
    const agent = { role: 'Explore', title: 'Review the parser' };

    expect(subagentRoleMark(agent)).toEqual(marks.explore);
    expect(subagentMarkLabel(agent)).toBe('Explore Agent');
  });

  it('guesses from the title when the reported role is unknown, keeping the reported name', () => {
    const agent = { role: 'worker', title: 'Follow up standards review' };

    expect(subagentRoleMark(agent)).toEqual(marks.review);
    expect(subagentMarkLabel(agent)).toBe('worker Agent');
  });

  it('draws the General mark when neither the role nor the title names one', () => {
    const agent = { role: null, title: 'Planet survey' };

    expect(subagentRoleMark(agent)).toEqual(marks.general);
    expect(subagentMarkLabel(agent)).toBe('General Agent');
  });

  it.each([
    ['Testing the plan', marks.test],
    ['Plan the review', marks.plan],
    ['Review the test plan', marks.review],
  ])('draws the first role the title %j names', (title, mark) => {
    expect(subagentRoleMark({ role: null, title })).toEqual(mark);
  });

  it('draws the General mark for a role named like an object key', () => {
    expect(
      subagentRoleMark({ role: 'constructor', title: 'Untitled' }),
    ).toEqual(marks.general);
  });
});
