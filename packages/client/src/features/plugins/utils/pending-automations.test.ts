import { describe, expect, it } from 'vitest';
import type { SessionPullRequest } from '#features/sessions';
import {
  answering,
  holding,
  releasing,
  unconfirmed,
  withPendingAutomations,
} from './pending-automations';
import type { AutomationTick } from './session-pull-request-actions';

const reference = 'owner/repository#12';

const rowWith = (merge: boolean): SessionPullRequest => ({
  stage: 'open',
  number: 12,
  title: 'Add the thing',
  mergeable: true,
  repository: 'owner/repository',
  automation: {
    fix: { on: false, available: true },
    merge: { on: merge, available: true },
    archive: { on: false, available: false },
  },
});

const tick = (on: boolean): AutomationTick => ({
  reference,
  kind: 'merge',
  on,
});

// Whether Auto-merge reads on, for each row that offers it.
const mergeOn = (rows: SessionPullRequest[]): boolean[] =>
  rows.flatMap((row) => (row.automation ? [row.automation.merge.on] : []));

describe('a tick held ahead of the Plugin', () => {
  it('shows on its row from the press, and on no other automation', () => {
    const shown = withPendingAutomations(
      [rowWith(false)],
      holding({}, tick(true)),
    );

    expect(shown.map((row) => row.automation)).toEqual([
      {
        fix: { on: false, available: true },
        merge: { on: true, available: true },
        archive: { on: false, available: false },
      },
    ]);
  });

  it('leaves the rows as they are when nothing is held', () => {
    const rows = [rowWith(false)];

    expect(withPendingAutomations(rows, {})).toBe(rows);
  });

  it('leaves a row of another pull request alone', () => {
    const other = { ...rowWith(false), number: 13 };

    expect(
      mergeOn(withPendingAutomations([other], holding({}, tick(true)))),
    ).toEqual([false]);
  });

  it('is taken back when released, so the row says what the Plugin says', () => {
    const on = tick(true);
    const released = releasing(holding({}, on), on);

    expect(mergeOn(withPendingAutomations([rowWith(false)], released))).toEqual(
      [false],
    );
  });

  it('is let go of once its Operation answered and the row carries it', () => {
    const on = tick(true);
    const answered = answering(holding({}, on), on);

    expect(unconfirmed(answered, [rowWith(false)])).toBe(answered);
    expect(unconfirmed(answered, [rowWith(true)])).toEqual({});
  });

  it('stays while its Operation runs, though the row already matches it', () => {
    const off = tick(false);
    const running = holding(holding({}, tick(true)), off);

    expect(unconfirmed(running, [rowWith(false)])).toBe(running);
    expect(mergeOn(withPendingAutomations([rowWith(true)], running))).toEqual([
      false,
    ]);
  });

  it('is not answered or released by an earlier tick on the same automation', () => {
    const first = tick(true);
    const second = tick(false);
    const held = holding(holding({}, first), second);

    expect(answering(held, first)).toBe(held);
    expect(releasing(held, first)).toBe(held);
  });
});
