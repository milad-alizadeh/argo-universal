import { describe, expect, it } from 'vitest';
import { platformName } from './agent-list';
import {
  type AgentRowEntry,
  type AgentStatus,
  type AgentsFilter,
  countAgents,
  filterAgents,
  runsSessions,
} from './agent-status';

const firstId = 'first-agent';
const secondId = 'second-agent';
const ready: AgentRowEntry = {
  id: firstId,
  name: 'First Agent',
  description: 'Writes code',
  status: 'ready',
};
const signIn: AgentRowEntry = {
  id: secondId,
  name: 'Second Agent',
  status: 'sign-in',
};
const goose: AgentRowEntry = {
  id: 'goose',
  name: 'goose',
  description: 'An open source agent',
  status: 'not-installed',
};
const agents = [ready, signIn, goose];

describe('filterAgents', () => {
  it.each<[AgentsFilter, string[]]>([
    ['all', [firstId, secondId, 'goose']],
    ['installed', [firstId, secondId]],
    ['not-installed', ['goose']],
  ])('keeps the %s Agents', (filter, ids) => {
    const shown = filterAgents(agents, { filter, search: '' });
    expect(shown.map(({ id }) => id)).toEqual(ids);
  });

  it('matches a search in the name or the description, ignoring case', () => {
    const shown = filterAgents(agents, { filter: 'all', search: ' OPEN ' });
    expect(shown).toEqual([goose]);
  });
});

describe('countAgents', () => {
  it('counts installed and not installed Agents', () => {
    expect(countAgents(agents)).toEqual({ installed: 2, notInstalled: 1 });
  });
});

describe('runsSessions', () => {
  it.each<[AgentStatus, boolean]>([
    ['ready', true],
    ['update', true],
    ['sign-in', false],
    ['unavailable', false],
    [goose.status, false],
  ])('is %s → %s', (status, runs) => {
    expect(runsSessions({ status })).toBe(runs);
  });
});

describe('platformName', () => {
  it.each([
    ['darwin-aarch64', 'macOS'],
    ['linux-x86_64', 'Linux'],
    ['windows-x86_64', 'Windows'],
    ['plan9-mips', 'plan9-mips'],
  ])('names %s as %s', (platform, name) => {
    expect(platformName(platform)).toBe(name);
  });
});
