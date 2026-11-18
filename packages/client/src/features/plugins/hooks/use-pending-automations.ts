import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { SessionPullRequest } from '#features/sessions';
import {
  answering,
  confirming,
  holding,
  type PendingAutomations,
  releasing,
  unconfirmed,
  withPendingAutomations,
} from '../utils/pending-automations';
import type {
  AutomationTick,
  RowActionPorts,
} from '../utils/session-pull-request-actions';

/*
 * How long an answered tick stands over the rows whatever they say. Two quick ticks on one automation are read back
 * one after the other, and without this the first one's refresh showed for a moment under the second.
 */
const settleTick = 3000;

/*
 * How long an answered tick waits, at most, for the Plugin's row to carry it. A row that lands sooner takes the tick
 * over unseen; past this the reader is shown what the Plugin really has rather than a tick it did not keep. Three
 * seconds let a slow refresh flick the tick back and on again.
 */
const dropTick = 15_000;

export interface PendingAutomationRows {
  // The rows with each held tick shown on them.
  rows: SessionPullRequest[];
  // Holds a tick from the press, for the rows' actions to call.
  hold: RowActionPorts['hold'];
}

type SetPending = Dispatch<SetStateAction<PendingAutomations>>;

/*
 * The Changes with the automation ticks made in their menus shown at once. A row draws straight from what the Plugin
 * sends, and Auto-merge asks GitHub before the Plugin answers, so a tick moved nothing for seconds; it now shows from
 * the press, a failure takes it back, and the Plugin's row takes it over (owner, 2026-11-18).
 */
export function usePendingAutomations(
  rows: SessionPullRequest[],
): PendingAutomationRows {
  const [pending, setPending] = useState<PendingAutomations>({});
  const later = useLater();
  const open = unconfirmed(pending, rows);

  if (open !== pending) setPending(open);

  return {
    rows: withPendingAutomations(rows, open),
    hold: (tick) => {
      setPending((held) => holding(held, tick));

      return settling(tick, setPending, later);
    },
  };
}

// A failed tick is taken back at once; an answered one settles, then waits for the Plugin's row until it is dropped.
const settling =
  (tick: AutomationTick, setPending: SetPending, later: Later) =>
  (answered: boolean): void => {
    const release = (): void => setPending((held) => releasing(held, tick));

    if (!answered) return release();

    setPending((held) => answering(held, tick));
    later(() => setPending((held) => confirming(held, tick)), settleTick);
    later(release, dropTick);
  };

type Later = (run: () => void, wait: number) => void;

type Timer = ReturnType<typeof setTimeout>;

function clearAll(timers: Set<Timer>): void {
  for (const timer of timers) clearTimeout(timer);
}

// Runs each call after its wait, and none once the rows are gone.
function useLater(): Later {
  const [timers] = useState(() => new Set<Timer>());

  useEffect(() => (): void => clearAll(timers), [timers]);

  return (run, wait) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, wait);

    timers.add(timer);
  };
}
