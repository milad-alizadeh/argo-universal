import {
  mergedItems,
  SessionActivityItem,
  SessionRowItem,
} from '@repo/contracts/plugins/wire';
import {
  type PluginLookup,
  type SessionRowPlugins,
  sessionRowPlugins,
  type ShownRowAnswer,
} from '#features/sessions';
import {
  ownerItem,
  shownItems,
  type SlotChoices,
  slotVisibility,
  type SlotVisibility,
  type SplitItems,
} from '#features/settings';
import type { DrawFromSent, SentAnswer } from './session-row-cache';

// One Session's answers from both Session row Slots, as the Server split them.
export interface SessionRowAnswer {
  items: SplitItems<SessionRowItem>;
  lines: SplitItems<SessionActivityItem>;
}

const noAnswer = { items: [], overflow: [] };

const RowItems = mergedItems(SessionRowItem).catch(noAnswer);

const ActivityLines = mergedItems(SessionActivityItem).catch(noAnswer);

// A Server that sent no answer for a Session, or something else, gives none.
export const rowAnswer = (
  items: SentAnswer,
  lines: SentAnswer,
): SessionRowAnswer => ({
  items: RowItems.parse(items),
  lines: ActivityLines.parse(lines),
});

// The chosen Plugin's line, when it has one for the Session; none while the line is Argo's.
function chosenLine(
  lines: SessionRowAnswer['lines'],
  visibility: SlotVisibility,
): ShownRowAnswer['activity'] {
  const line = ownerItem(lines, visibility);

  if (visibility.owner === null || !line) return undefined;

  return { pluginId: visibility.owner, text: line.text };
}

/*
 * What this Device shows of a Session's answers: the items of the Plugins left on, one hidden making room for the next
 * in line, and the chosen Plugin's line; a Plugin turned off gives the line back to Argo.
 */
const shownRowAnswer = (
  answer: SessionRowAnswer,
  visibility: SlotVisibility,
): ShownRowAnswer => ({
  ...shownItems(answer.items, visibility),
  activity: chosenLine(answer.lines, visibility),
});

// What a row draws from one Session's answers under this Device's choices.
export type DrawRow = (
  answer: SessionRowAnswer,
) => SessionRowPlugins | undefined;

export const rowDrawing =
  (visibility: SlotVisibility, lookup: PluginLookup): DrawRow =>
  (answer) =>
    sessionRowPlugins(shownRowAnswer(answer, visibility), lookup);

// How every row draws from the answers as the Server sent them, under this Device's choices and the Plugins' names.
export function sentDrawing(
  choices: SlotChoices,
  lookup: PluginLookup,
): DrawFromSent<SessionRowPlugins> {
  const draw = rowDrawing(slotVisibility(choices), lookup);

  return (items, lines) => draw(rowAnswer(items, lines));
}
