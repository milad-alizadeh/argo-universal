import {
  sessionRowSlotId,
  slotItemsListLimit,
} from '@repo/contracts/plugins/wire';
import { useMemo, useState } from 'react';
import type {
  SessionRowPlugins,
  SessionsListPlugins,
} from '#features/sessions';
import { useSlotChoices } from '#features/settings';
import {
  cachedRows,
  type DrawFromSent,
  type KeptAnswers,
  keptAnswers,
  noKeptAnswers,
  redrawnRows,
  type RowCache,
  type RowSnapshot,
} from '../utils/session-row-cache';
import { sentDrawing } from '../utils/session-row-drawing';
import { useDrawnSessions } from './use-drawn-sessions';
import { usePluginLookup } from './use-plugin-names';
import {
  type RowContexts,
  type RowSession,
  useKeyed,
  useRowSnapshot,
} from './use-session-row-answers';

const bySessionId = (a: RowSession, b: RowSession): number =>
  a.sessionId.localeCompare(b.sessionId);

/*
 * The drawn rows' Sessions for one batched call, in one order whatever order the rows take, so a row moving
 * up asks nothing again; one call names at most `slotItemsListLimit` of them.
 */
function useWindowContexts(
  sessions: readonly RowSession[],
  drawn: ReadonlySet<string>,
): RowContexts | undefined {
  const asked = sessions
    .filter(({ sessionId }) => drawn.has(sessionId))
    .sort(bySessionId)
    .slice(0, slotItemsListLimit)
    .map(({ sessionId, projectId }) => ({ sessionId, projectId }));

  const key = asked.map(({ sessionId }) => sessionId).join(',');

  return useKeyed(key, asked.length ? asked : undefined);
}

// Folds each new input into the value held from the last, the way a reducer folds actions.
function useFolded<Input, Value>(
  input: Input,
  fold: (held: Value, input: Input) => Value,
  initial: Value,
): Value {
  const [held, setHeld] = useState(() => ({
    input,
    value: fold(initial, input),
  }));

  if (Object.is(held.input, input)) return held.value;

  const next = { input, value: fold(held.value, input) };

  setHeld(next);

  return next.value;
}

const useKept = (snapshot: RowSnapshot): KeptAnswers =>
  useFolded(snapshot, keptAnswers, noKeptAnswers);

// This Device's choices and the Plugins' names: a change to either redraws every row.
function useDraw(): DrawFromSent<SessionRowPlugins> {
  const choices = useSlotChoices(sessionRowSlotId);
  const lookup = usePluginLookup();

  return useMemo(() => sentDrawing(choices, lookup), [choices, lookup]);
}

interface Drawing {
  draw: DrawFromSent<SessionRowPlugins>;
  cache: RowCache<SessionRowPlugins>;
}

// Draws nothing until this Device's choices are read.
const drawNothing: DrawFromSent<SessionRowPlugins> = () => {};

const noDrawing: Drawing = { draw: drawNothing, cache: new Map() };

const redraw = (
  held: Drawing,
  input: { kept: KeptAnswers } & Pick<Drawing, 'draw'>,
): Drawing => ({
  draw: input.draw,
  cache: redrawnRows(
    held.draw === input.draw ? held.cache : noDrawing.cache,
    input.kept,
    input.draw,
  ),
});

// Each Session's row content, the same object until that Session's answers, the choices or the Plugins' names change.
function useRows(
  snapshot: RowSnapshot,
): ReadonlyMap<string, SessionRowPlugins> {
  const kept = useKept(snapshot);
  const draw = useDraw();
  const input = useMemo(() => ({ kept, draw }), [kept, draw]);
  const { cache } = useFolded(input, redraw, noDrawing);

  return useMemo(() => cachedRows(cache), [cache]);
}

type RowPlugins = Pick<SessionsListPlugins, 'rows' | 'onRowsDrawn'>;

/*
 * What the Plugins add to each Session row under this Device's choices (ADR-0035). Only the rows the list draws are
 * asked about, once they settle; a row that scrolls away keeps its last answer until it is drawn and asked about again.
 */
export function useSessionRowPlugins(
  sessions: readonly RowSession[],
): RowPlugins {
  const { drawn, onRowsDrawn } = useDrawnSessions();
  const snapshot = useRowSnapshot(useWindowContexts(sessions, drawn));
  const rows = useRows(snapshot);

  return useMemo(() => ({ rows, onRowsDrawn }), [rows, onRowsDrawn]);
}
