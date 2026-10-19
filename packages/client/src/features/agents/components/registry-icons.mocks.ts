import type { AgentsRegistryOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import type { AgentRowEntry } from '../utils/agent-rows';

const entry = publishedRegistry.agents[0];

if (!entry?.icon) throw new Error('Registry mock needs an encoded SVG icon');

export const iconAgent: AgentsRegistryOutput['agents'][number] = {
  entry,
  support: 'npx',
};

export const encodedIcon = entry.icon;

export const iconXml =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#8e8e93"/></svg>';

export const base64Icon =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjOGU4ZTkzIi8+PC9zdmc+';

export const malformedIconXml = '<svg><rect></svg>';

// The card's row for the same Registry entry, before the Agent is added.
export const agentRow: AgentRowEntry = {
  id: entry.id,
  name: entry.name,
  description: entry.description,
  version: entry.version,
  installed: false,
  unavailable: false,
};
