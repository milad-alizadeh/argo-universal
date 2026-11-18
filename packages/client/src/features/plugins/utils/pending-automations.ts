import type { ChangeAutomationKind } from '@repo/contracts';
import type { SessionPullRequest } from '#features/sessions';
import {
  type AutomationTick,
  referenceOf,
} from './session-pull-request-actions';

// A tick the menu shows ahead of the Plugin's row, and whether its Operation has answered yet.
type Held = { tick: AutomationTick; answered: boolean };

// The ticks made here that the Plugin's rows do not carry yet, by the PR and automation each was made on.
export type PendingAutomations = Readonly<Record<string, Held>>;

const keyOf = ({
  reference,
  kind,
}: Pick<AutomationTick, 'reference' | 'kind'>): string =>
  `${reference}:${kind}`;

// A later tick on the same automation takes an earlier one's place, so the earlier one no longer speaks for it.
const isHeld = (pending: PendingAutomations, tick: AutomationTick): boolean =>
  pending[keyOf(tick)]?.tick === tick;

const without = (
  pending: PendingAutomations,
  key: string,
): PendingAutomations =>
  Object.fromEntries(Object.entries(pending).filter(([held]) => held !== key));

const withHeld = (
  pending: PendingAutomations,
  held: Held,
): PendingAutomations =>
  Object.fromEntries([...Object.entries(pending), [keyOf(held.tick), held]]);

// The tick shows from the press, before its Operation has run.
export const holding = (
  pending: PendingAutomations,
  tick: AutomationTick,
): PendingAutomations => withHeld(pending, { tick, answered: false });

// The Operation answered: the tick stands until the Plugin's row carries it.
export const answering = (
  pending: PendingAutomations,
  tick: AutomationTick,
): PendingAutomations =>
  isHeld(pending, tick) ? withHeld(pending, { tick, answered: true }) : pending;

// The tick is let go of, and the row shows what the Plugin says again.
export const releasing = (
  pending: PendingAutomations,
  tick: AutomationTick,
): PendingAutomations =>
  isHeld(pending, tick) ? without(pending, keyOf(tick)) : pending;

const carries = (
  rows: readonly SessionPullRequest[],
  { reference, kind, on }: AutomationTick,
): boolean =>
  rows.some(
    (row) => referenceOf(row) === reference && row.automation?.[kind].on === on,
  );

/*
 * A tick the rows now carry is no longer held: the Plugin speaks for it again. One whose Operation is still running
 * stays, since the rows may match only because an earlier tick on the same automation has not landed yet.
 */
export function unconfirmed(
  pending: PendingAutomations,
  rows: readonly SessionPullRequest[],
): PendingAutomations {
  const waiting = Object.entries(pending).filter(
    ([, held]) => !(held.answered && carries(rows, held.tick)),
  );

  return waiting.length === Object.keys(pending).length
    ? pending
    : Object.fromEntries(waiting);
}

type Automation = NonNullable<SessionPullRequest['automation']>;

const shownState = (
  state: Automation[ChangeAutomationKind],
  held: Held | undefined,
): Automation[ChangeAutomationKind] =>
  held ? { ...state, on: held.tick.on } : state;

const shownAutomation = (
  automation: Automation,
  heldFor: (kind: ChangeAutomationKind) => Held | undefined,
): Automation => ({
  fix: shownState(automation.fix, heldFor('fix')),
  merge: shownState(automation.merge, heldFor('merge')),
  archive: shownState(automation.archive, heldFor('archive')),
});

function shownRow(
  row: SessionPullRequest,
  pending: PendingAutomations,
): SessionPullRequest {
  const reference = referenceOf(row);

  if (!reference || !row.automation) return row;

  return {
    ...row,
    automation: shownAutomation(
      row.automation,
      (kind) => pending[keyOf({ reference, kind })],
    ),
  };
}

// The rows as the reader last left them: each held tick stands in for what the Plugin's row says.
export const withPendingAutomations = (
  rows: SessionPullRequest[],
  pending: PendingAutomations,
): SessionPullRequest[] =>
  Object.keys(pending).length === 0
    ? rows
    : rows.map((row) => shownRow(row, pending));
