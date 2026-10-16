import type { SessionUpdate, TextContent } from '@repo/contracts';

export function thoughtTitle(
  current: readonly SessionUpdate[],
): string | undefined {
  const thought = current
    .filter(
      (
        row,
      ): row is Extract<SessionUpdate, { sessionUpdate: 'agent_thought' }> =>
        row.sessionUpdate === 'agent_thought',
    )
    .toSorted((first, second): number => first.position - second.position)
    .at(-1);

  return thought && boldTitle(thoughtText(thought));
}

function thoughtText(
  thought: Extract<SessionUpdate, { sessionUpdate: 'agent_thought' }>,
): string {
  return thought.content
    .filter((block): block is TextContent => block.type === 'text')
    .map((block): string => block.text)
    .join('\n');
}

function boldTitle(text: string): string | undefined {
  return [
    ...text.matchAll(
      /^[\p{Zs}\t\v\f\uFEFF]*\*\*([^\n]+?)\*\*[\p{Zs}\t\v\f\uFEFF]*$/gmu,
    ),
  ]
    .at(-1)?.[1]
    ?.trim();
}
