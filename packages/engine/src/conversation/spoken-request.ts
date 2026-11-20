import type { PendingPermission, SessionUpdate } from '@repo/contracts';
import { z } from 'zod';
import type { SpokenRequest } from './relay-words';

type ToolRow = Extract<SessionUpdate, { sessionUpdate: 'tool_call_update' }>;

// A Tool call whose input names the command it runs.
const RunsCommand = z.looseObject({
  rawInput: z.looseObject({ command: z.string() }),
});

const commandsOf = (tool: ToolRow): string[] => {
  const parsed = RunsCommand.safeParse(tool);

  return parsed.success ? [parsed.data.rawInput.command] : [];
};

const placesOf = (tool: ToolRow): string[] =>
  (tool.locations ?? []).map(({ path }) => path);

// What the Tool call acts on: the command it runs, else the first place it touches.
const toolTarget = (tool: ToolRow): string | null =>
  [...commandsOf(tool), ...placesOf(tool)].at(0) ?? null;

// The Session's Tool call row the request asks about.
export const askedToolRow = (
  rows: Readonly<Record<string, SessionUpdate>>,
  toolCallId: string,
): ToolRow | undefined =>
  Object.values(rows).find(
    (row): row is ToolRow =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  );

type Described = Pick<SpokenRequest, 'kind' | 'target'>;

const toolDescribed = (tool: ToolRow | undefined): Described =>
  tool
    ? { kind: tool.kind, target: toolTarget(tool) }
    : { kind: 'other', target: null };

const described = (
  { operation }: PendingPermission,
  tool: ToolRow | undefined,
): Described =>
  operation ? { kind: 'operation', target: operation.id } : toolDescribed(tool);

/*
 * A waiting Permission request in plain words for the voice (ADR-0064): its title, what kind of thing it asks to do, what
 * it acts on and which Agent asks. The request itself, with its options and ids, never reaches the voice.
 */
export const spokenRequest = (
  pending: PendingPermission,
  tool: ToolRow | undefined,
  agent: string,
): SpokenRequest => ({
  agent,
  title: pending.title,
  ...described(pending, tool),
});
