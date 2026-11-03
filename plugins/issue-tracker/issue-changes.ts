import { useEffect, useState } from '@argo/plugin-kit';
import type { IssueStatus } from './github-issues';
import { createListeners } from './listeners';
import { freshForMs } from './use-github';

// The changed Issue's number and the status it now has.
type Listener = (number: number, status: IssueStatus) => void;

type Change = { status: IssueStatus; at: number };

/*
 * An Issue whose status changed on one page, told to the other pages so their rows show it at once. It reloads nothing:
 * a page that is not on screen must not call GitHub for it, and the next fresh answer carries the status anyway.
 */
export type IssueChanges = {
  subscribe: (listener: Listener) => () => void;
  publish: (number: number, status: IssueStatus) => void;
  // The statuses changed here recently enough that GitHub's answers may not show them yet.
  recent: () => ReadonlyMap<number, IssueStatus>;
};

const freshStatus = ([number, { status, at }]: [number, Change]): [
  number,
  IssueStatus,
][] => (Date.now() - at < freshForMs ? [[number, status]] : []);

const recentOf = (
  changes: Map<number, Change>,
): ReadonlyMap<number, IssueStatus> =>
  new Map([...changes].flatMap(freshStatus));

export function createIssueChanges(): IssueChanges {
  const { subscribe, tell } = createListeners<[number, IssueStatus]>();
  const changes = new Map<number, Change>();

  return {
    subscribe,
    publish: (number, status) => {
      changes.set(number, { status, at: Date.now() });
      tell(number, status);
    },
    recent: () => recentOf(changes),
  };
}

// Draws again whenever an Issue's status changes on another page; answers the statuses to show over the list.
export function useRecentStatuses(
  changes: IssueChanges,
): ReadonlyMap<number, IssueStatus> {
  const [, setVersion] = useState(0);

  useEffect(
    () => changes.subscribe(() => setVersion((version) => version + 1)),
    [changes],
  );

  return changes.recent();
}
