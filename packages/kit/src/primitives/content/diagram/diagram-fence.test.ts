import { expect, it } from 'vitest';
import { isDiagramFence, isOpenFence } from './diagram-fence';

it('draws only Mermaid fences', () => {
  expect(isDiagramFence('mermaid')).toBe(true);
  expect(isDiagramFence(' Mermaid ')).toBe(true);
  expect(isDiagramFence('ts')).toBe(false);
});

it.each([
  ['```mermaid\nflowchart TD\n A --> B', true],
  ['```mermaid', true],
  ['```mermaid\nflowchart TD\n``', true],
  ['````mermaid\nflowchart TD\n```', true],
  ['```mermaid\nflowchart TD\n A --> B\n```', false],
  ['```mermaid\nflowchart TD\n```\n\n', false],
  ['~~~mermaid\nflowchart TD\n~~~', false],
])('reads %j as open: %s', (raw, open) => {
  expect(isOpenFence(raw)).toBe(open);
});
