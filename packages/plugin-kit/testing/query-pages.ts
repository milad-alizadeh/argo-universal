import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginTest } from './test-types';

// The described Query the data fixture's executable answers: its count of requests so far.
export const processRead =
  "{ api: 'process', action: 'run', argv: ['query-fixture'] }";

type TextPage = { load: string; every?: number };

const definition = ([path, { load, every }]: [string, TextPage]): string => `
  argo.pages.define(${JSON.stringify(path)}, {
    ${every === undefined ? '' : `every: ${every},`}
    load: ${load},
    render: (text) => <Text>{String(text)}</Text>,
  });`;

// Loader pages that each draw one Text of what they read, at the paths and with the `every` given.
export const textPages = (
  pages: Record<string, TextPage>,
): string => `import { Text } from '@argo/plugin-kit';
export function register(argo) {${Object.entries(pages).map(definition).join('')}
}`;

type DrawInput = Parameters<PluginTest['pages']['draw']>[0];

// The text a Loader page drew, or why it could not draw thrown.
export async function drawnText(
  kit: PluginTest,
  input: DrawInput,
): Promise<string> {
  const answer = await kit.pages.draw(input);

  if (answer.kind === 'failed') throw new Error(answer.error);

  if (answer.kind !== 'tree') throw new Error(`Answered ${answer.kind}`);

  return textOf(answer.root.props.children);
}

// A root that shows a string or a number shows it as text; any other root drew no text.
function textOf(children: WireJson | undefined): string {
  if (typeof children === 'string') return children;

  if (typeof children === 'number') return String(children);

  throw new Error('The page drew no text');
}
