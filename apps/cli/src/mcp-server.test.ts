import { argoInstructions } from '@repo/contracts/agents/argo-instructions';
import { expect, it } from 'vitest';
import { mcpInstructions } from './mcp-server';

const discoveryLine =
  'Discover: call operation_list with a task-specific filter. ' +
  'Read the matching params schema and availability before calling operation_run.';

const section = ({ name, text }: { name: string; text: string }): string =>
  `## ${name}\n\n${text}`;

const head = [discoveryLine, ...argoInstructions.map(section)].join('\n\n');

it('sends the discovery line and every Argo instruction when no Plugin has prose', () => {
  expect(mcpInstructions({})).toBe(head);
});

it('follows the Argo instructions with each Plugin prose under its name, in the order given', () => {
  expect(
    mcpInstructions({
      plugins: [
        { pluginId: 'alpha', name: 'Zulu', text: 'First.' },
        { pluginId: 'zeta', name: 'Alpha', text: 'Last.' },
      ],
    }),
  ).toBe(`${head}\n\n## Zulu\n\nFirst.\n\n## Alpha\n\nLast.`);
});
