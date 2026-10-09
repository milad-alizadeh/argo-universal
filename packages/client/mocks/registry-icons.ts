import type { AgentsCatalogOutput } from '@repo/contracts';
import { publishedRegistry } from '@repo/mocks/registry/catalog';

const entry = publishedRegistry.agents[0];
if (!entry?.icon) throw new Error('Registry mock needs an encoded SVG icon');

export const iconAgent: AgentsCatalogOutput['agents'][number] = {
  entry,
  support: { kind: 'npx', recipe: { package: 'example-agent@1.2.3' } },
};
export const encodedIcon = entry.icon;
export const iconXml =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#8e8e93"/></svg>';
export const base64Icon =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjOGU4ZTkzIi8+PC9zdmc+';
export const malformedIconXml = '<svg><rect></svg>';
