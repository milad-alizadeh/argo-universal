import { describe, expect, it } from 'vitest';
import { planTitle, withoutPlanTitle } from './plan-title';

const plan = 'Intro\n\n# Fix the README typo\n\n1. Read README.md\n';

describe('planTitle', () => {
  it('reads the first heading', () => {
    expect(planTitle(plan, 'Plan')).toBe('Fix the README typo');
  });

  it('falls back without a heading', () => {
    expect(planTitle('1. Fix it', 'Plan')).toBe('Plan');
  });
});

describe('withoutPlanTitle', () => {
  it('drops only the first heading', () => {
    expect(withoutPlanTitle(`${plan}\n## Steps\n`)).toBe(
      'Intro\n\n1. Read README.md\n\n## Steps\n',
    );
  });

  it('keeps a plan without a heading', () => {
    expect(withoutPlanTitle('1. Fix it')).toBe('1. Fix it');
  });
});
