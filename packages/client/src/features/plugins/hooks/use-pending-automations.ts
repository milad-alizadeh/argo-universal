import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { SessionPullRequest } from '#features/sessions';
import {
  answering,
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
 * How long a tick stands once its Operation has answered. The Plugin's row is read again after the answer, so the
 * tick is held until that row carries it, and let go of after this, which leaves the reader looking at what the
 * Plugin really has rather than at a tick it did not keep.
 */
export const holdAnsweredTick = 3000;

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
  const later = useLater(holdAnsweredTick);
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

// A failed tick is taken back at once; an answered one waits for the Plugin's row, and no longer than the hold.
const settling =
  (tick: AutomationTick, setPending: SetPending, later: Later) =>
  (answered: boolean): void => {
    const release = (): void => setPending((held) => releasing(held, tick));

    if (!answered) return release();

    setPending((held) => answering(held, tick));
    later(release);
  };

type Later = (run: () => void) => void;

type Timer = ReturnType<typeof setTimeout>;

function clearAll(timers: Set<Timer>): void {
  for (const timer of timers) clearTimeout(timer);
}

// Runs each call after the wait, and none once the rows are gone.
function useLater(wait: number): Later {
  const [timers] = useState(() => new Set<Timer>());

  useEffect(() => (): void => clearAll(timers), [timers]);

  return (run) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, wait);

    timers.add(timer);
  };
}
