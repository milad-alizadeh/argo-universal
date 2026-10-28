import type { SessionInfo } from '@repo/contracts';
import {
  mergedItems,
  SessionActivityItem,
  SessionRowItem,
  type SlotItems,
  type SlotItemsInput,
  sessionActivitySlotId,
  sessionRowSlotId,
  slotItemsListLimit,
} from '@repo/contracts/plugins/wire';
import { useMemo } from 'react';
import { z } from 'zod';
import type { SessionRowPlugins } from '#features/sessions';
import {
  type PluginOf,
  type SessionRowAnswer,
  sessionRowPlugins,
  slotVisibility,
  type SlotVisibility,
  useSlotChoices,
} from '#features/settings';
import { usePluginOf } from './use-plugin-names';
import { useSlotItems } from './use-slot-items';

type RowSession = Pick<SessionInfo, 'sessionId' | 'projectId'>;

type Contexts = SlotItemsInput['contexts'];

const Contexts = z.array(
  z.object({ sessionId: z.string(), projectId: z.string() }),
);

// A Server that sent no answer for a Session, or something else, gives none.
const noAnswer = { items: [], overflow: [] };

const RowItems = mergedItems(SessionRowItem).catch(noAnswer);

const ActivityLines = mergedItems(SessionActivityItem).catch(noAnswer);

const contextKey = ({ sessionId, projectId }: RowSession): string =>
  JSON.stringify({ sessionId, projectId });

/*
 * The list's contexts for one batched call, in one order whatever order the rows take, so a row moving up asks nothing
 * again. A list longer than one call takes asks for its first rows, the ones on screen first.
 */
function useContexts(sessions: readonly RowSession[]): Contexts | undefined {
  const keys = sessions
    .slice(0, slotItemsListLimit)
    .map(contextKey)
    .toSorted()
    .join(',');

  return useMemo(
    () => (keys ? Contexts.parse(JSON.parse(`[${keys}]`)) : undefined),
    [keys],
  );
}

const inputOf = (
  slotId: SlotItemsInput['slotId'],
  contexts: Contexts | undefined,
): SlotItemsInput | undefined => contexts && { slotId, contexts };

// Both Slots' answers for the list: the Sessions any Plugin answered for, and one Session's answers.
export interface SessionRowAnswers {
  sessionIds: readonly string[];
  answerOf: (sessionId: string) => SessionRowAnswer;
}

/*
 * Both Session row Slots' answers for a list of Sessions: one batched call per Slot for the whole list, live from the
 * Server. The Sessions list and the Settings preview both ask through this.
 */
export function useSessionRowAnswers(
  sessions: readonly RowSession[],
): SessionRowAnswers {
  const contexts = useContexts(sessions);
  const items = useSlotItems(inputOf(sessionRowSlotId, contexts));
  const lines = useSlotItems(inputOf(sessionActivitySlotId, contexts));

  return useMemo(() => answersOf(items, lines), [items, lines]);
}

const answersOf = (items: SlotItems, lines: SlotItems): SessionRowAnswers => ({
  sessionIds: [...new Set([...Object.keys(items), ...Object.keys(lines)])],
  answerOf: (sessionId) => ({
    items: RowItems.parse(items[sessionId]),
    lines: ActivityLines.parse(lines[sessionId]),
  }),
});

// This Device's choices for Session rows: the Plugins turned off, and who writes the Activity line.
function useRowVisibility(): SlotVisibility {
  const choices = useSlotChoices(sessionRowSlotId);

  return useMemo(() => slotVisibility(choices), [choices]);
}

const plugged = (
  { sessionIds, answerOf }: SessionRowAnswers,
  visibility: SlotVisibility,
  pluginOf: PluginOf,
): Map<string, SessionRowPlugins> =>
  new Map(
    sessionIds.flatMap((sessionId) => {
      const plugins = sessionRowPlugins(
        answerOf(sessionId),
        visibility,
        pluginOf,
      );

      return plugins ? [[sessionId, plugins] as const] : [];
    }),
  );

/*
 * What the Plugins add to each Session row, under this Device's choices; a row they leave alone is not listed. It
 * changes only when an answer, a choice or a Plugin's name or glyph does, so a Session's own updates redraw only its row.
 */
export function useSessionRowPlugins(
  sessions: readonly RowSession[],
): ReadonlyMap<string, SessionRowPlugins> {
  const answers = useSessionRowAnswers(sessions);
  const visibility = useRowVisibility();
  const pluginOf = usePluginOf();

  return useMemo(
    () => plugged(answers, visibility, pluginOf),
    [answers, visibility, pluginOf],
  );
}
