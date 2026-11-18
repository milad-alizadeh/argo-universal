import type { ContextUsage, Plan, PlanEntry } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { composerStatus } from './composer-status';

const entries: PlanEntry[] = [
  { content: 'Read the spec', priority: 'medium', status: 'completed' },
];

const itemsPlan: Plan = { type: 'items', planId: 'plan-1', entries };

const filePlan: Plan = {
  type: 'file',
  planId: 'plan-2',
  uri: 'file:///project/plan.md',
};

const usage: ContextUsage = { used: 12_000, size: 200_000 };

const modelCallUsage: ContextUsage = { ...usage, scope: 'model-call' };

describe('composerStatus', () => {
  it.each<{
    case: string;
    plan: Plan | null;
    usage: ContextUsage | undefined;
    expected: ReturnType<typeof composerStatus>;
  }>([
    {
      case: 'nothing without a plan or usage',
      plan: null,
      usage: undefined,
      expected: undefined,
    },
    {
      case: 'nothing for a written plan alone',
      plan: filePlan,
      usage: undefined,
      expected: undefined,
    },
    {
      case: "a plan's steps",
      plan: itemsPlan,
      usage: undefined,
      expected: { plan: entries, context: undefined },
    },
    {
      case: 'the context window without a plan',
      plan: filePlan,
      usage,
      expected: { plan: undefined, context: usage },
    },
    {
      case: 'the latest model-call estimate',
      plan: null,
      usage: modelCallUsage,
      expected: { plan: undefined, context: modelCallUsage },
    },
    {
      case: 'the opening usage estimate',
      plan: null,
      usage: { ...usage, scope: 'unverified' },
      expected: { plan: undefined, context: { ...usage, scope: 'unverified' } },
    },
    {
      case: 'nothing without a known context capacity',
      plan: null,
      usage: { used: 0, size: 0 },
      expected: undefined,
    },
    {
      case: 'a plan alongside the model-call estimate',
      plan: itemsPlan,
      usage: modelCallUsage,
      expected: { plan: entries, context: modelCallUsage },
    },
  ])('shows $case', ({ plan, usage: contextUsage, expected }) => {
    expect(composerStatus(plan, contextUsage)).toEqual(expected);
  });
});
