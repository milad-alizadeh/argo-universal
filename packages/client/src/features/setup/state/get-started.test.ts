import { describe, expect, it } from 'vitest';
import {
  type AgentStep,
  agentStep,
  type GitHubStep,
  type StepMarks,
  stepMarks,
} from './get-started';

const signedIn: AgentStep = { status: 'done', agentName: 'Claude' };
const noAgent: AgentStep = { status: 'not-found', checking: false };
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
  const claude = { name: 'Claude' };
  it.each<{
    case: string;
    agents: { name: string }[] | undefined;
    checkingAgain: boolean;
    expected: AgentStep | undefined;
  }>([
    {
      case: 'is done with the first Agent that runs Sessions',
      agents: [{ name: 'Codex' }, claude],
      checkingAgain: false,
      expected: { status: 'done', agentName: 'Codex' },
    },
    {
      case: 'finds no Agent when none runs Sessions',
      agents: [],
      checkingAgain: false,
      expected: noAgent,
    },
    {
      // Saying no Agent was found before the list arrives would be wrong.
      case: 'waits while the Agents are still loading',
      agents: undefined,
      checkingAgain: false,
      expected: undefined,
    },
    {
      case: 'is checking while the Server looks again',
      agents: [],
      checkingAgain: true,
      expected: { status: 'not-found', checking: true },
    },
    {
      case: 'stays done while the Server looks again',
      agents: [claude],
      checkingAgain: true,
      expected: { status: 'done', agentName: 'Claude' },
    },
  ])('$case', ({ agents, checkingAgain, expected }) => {
    expect(agentStep(agents, checkingAgain)).toEqual(expected);
  });
});
