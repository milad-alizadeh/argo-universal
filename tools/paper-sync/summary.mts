import type { IndexedNode } from './index-model.mts';
import { required } from './model.mts';

type Parsed = { nodes: IndexedNode[]; expand: string[] };

function summaryNode(
  match: RegExpExecArray,
  stack: IndexedNode[],
): IndexedNode {
  const depth = Math.floor(required(match[1]).length / 2);

  const node = {
    id: required(match[4]),
    name: required(match[3]),
    component: componentName(match),
    parentId: stack[depth - 1]?.id ?? null,
  };

  stack.length = depth;
  stack.push(node);

  return node;
}

function expansion(line: string, stack: IndexedNode[]): string[] {
  if (!line.trim().startsWith('...')) return [];
  const parent = stack.at(-1);

  if (stack.some((node) => node.component === 'SVG')) return [];

  return [parent].flatMap((node) => (node ? [node.id] : []));
}

export function parseSummary(summary: string): Parsed {
  const parsed: Parsed = { nodes: [], expand: [] };
  const stack: IndexedNode[] = [];

  for (const line of summary.split('\n')) {
    const match = /^(\s*)(?:(\w+) )?"(.*)" \(([^)]+)\)/.exec(line);

    if (match) parsed.nodes.push(summaryNode(match, stack));
    else parsed.expand.push(...expansion(line, stack));
  }

  return parsed;
}

function componentName(match: RegExpExecArray): string {
  return match[2] || 'Page';
}
