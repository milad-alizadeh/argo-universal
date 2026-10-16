import { describe, expect, it } from 'vitest';
import {
  type AgentStep,
  agentStep,
  type GitHubStep,
  type StepMarks,
  stepMarks,
} from './onboarding';

const signedIn: AgentStep = { status: 'done' };

const noAgent: AgentStep = { status: 'not-installed' };

const connected: GitHubStep = { status: 'signed-in', login: 'octocat' };

describe('stepMarks', () => {
  it.each<{
    case: string;
    agent: AgentStep;
    github: GitHubStep;
    expected: StepMarks;
  }>([
    {
      case: 'gives Add a Project the next action once the Agent and GitHub are done',
      agent: signedIn,
      github: connected,
      expected: { agent: 'done', github: 'done', project: 'next' },
    },
    {
      case: 'gives signing in to an Agent the next action before a Project',
      agent: noAgent,
      github: connected,
      expected: { agent: 'next', github: 'done', project: 'open' },
    },
    {
      case: 'skips GitHub, which is optional, for Add a Project',
      agent: signedIn,
      github: { status: 'not-connected' },
      expected: { agent: 'done', github: 'open', project: 'next' },
    },
    {
      case: 'never gives GitHub the next action, even when the Agent is missing',
      agent: noAgent,
      github: { status: 'login-found', login: 'octocat' },
      expected: { agent: 'next', github: 'open', project: 'open' },
    },
    {
      case: 'keeps an expired GitHub sign-in open',
      agent: signedIn,
      github: { status: 'expired', login: 'octocat' },
      expected: { agent: 'done', github: 'open', project: 'next' },
    },
  ])('$case', ({ agent, github, expected }) => {
    expect(stepMarks(agent, github)).toEqual(expected);
  });
});

describe('agentStep', () => {
  it.each([
    { agents: [], status: 'not-installed' },
    { agents: [{ id: 'saved-agent' }], status: 'done' },
  ])('is $status for saved choices', ({ agents, status }) => {
    expect(agentStep(agents)).toEqual({ status });
  });
});
