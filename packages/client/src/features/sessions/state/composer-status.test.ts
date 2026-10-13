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
      case: 'nothing for a latest-model-call proxy',
      plan: null,
      usage: { ...usage, scope: 'model-call' },
      expected: undefined,
    },
    {
      case: 'nothing before upstream scope is verified',
      plan: null,
      usage: { ...usage, scope: 'unverified' },
      expected: undefined,
    },
    {
      case: 'nothing without a known context capacity',
      plan: null,
      usage: { used: 0, size: 0 },
      expected: undefined,
    },
    {
      case: 'a plan without presenting a model-call proxy as context',
      plan: itemsPlan,
      usage: { ...usage, scope: 'model-call' },
      expected: { plan: entries, context: undefined },
    },
  ])('shows $case', ({ plan, usage: contextUsage, expected }) => {
    expect(composerStatus(plan, contextUsage)).toEqual(expected);
  });
});
