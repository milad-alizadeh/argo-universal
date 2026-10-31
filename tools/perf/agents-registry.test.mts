import { describe, expect, it } from 'vitest';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';
import {
  agentCount,
  distinctAgents,
  longRegistry,
} from './agents-registry.mts';

describe('the long registry the agents scenario starts its Server from', () => {
  it('lists exactly the number of Agents the scenario claims', () => {
    expect(distinctAgents(longRegistry())).toBe(agentCount);
  });

  it('lists that many even when the published Agents do not divide it', () => {
    const size = publishedRegistry.agents.length * 3 + 1;

    expect(distinctAgents(longRegistry(size))).toBe(size);
  });

  it('gives every Agent its own name', () => {
    const { agents } = longRegistry();

    expect(new Set(agents.map(({ name }) => name)).size).toBe(agentCount);
  });

  it('counts the scripted registry as the few Agents it is', () => {
    expect(distinctAgents(publishedRegistry)).toBeLessThan(agentCount);
  });

  it('refuses a registry that repeats an id', () => {
    const agent = { id: 'twice' };

    expect(() => distinctAgents({ agents: [agent, agent] })).toThrow(/ids/u);
  });
});
