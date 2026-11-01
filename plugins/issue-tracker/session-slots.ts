import type { Argo } from '@argo/plugin-kit';
import type { IssueDeps } from './issue-deps';
import { createIssueSummaries, type IssueSummaries } from './issue-summary';
import { registerSessionPages } from './session-issue-pages';
import { barItems, rowItems, type Linked, type PathOf } from './session-items';
import type { IssueLink, TrackerStorage } from './tracker-storage';

export const sessionRowSlot = 'argo/session/row/v1';

export const sessionBarSlot = 'argo/session/bar/v1';

type Attachments = Pick<TrackerStorage, 'attachSession' | 'detachSession'>;

type Request = Readonly<{
  contexts: readonly Readonly<{ sessionId: string }>[];
}>;

type ToItems = (entries: Linked[]) => ReturnType<typeof rowItems>;

/*
 * The Issue tracker's fills for a Session (ADR-0035): the Issues a Session is attached to (`attach`, ADR-0044) show as
 * items on its row and as one line in its Session bar, and as a Workbench card its manifest declares. The link is this
 * Plugin's own `issue_sessions` store. Returns the attachments wrapped so attaching or detaching refreshes the Slots.
 */
export function registerSessionFills(api: Argo, deps: IssueDeps): Attachments {
  const changed = slotsChanged(api);
  const summaries = createIssueSummaries(deps, changed);

  deps.changes.subscribe((number) =>
    announceStatus(summaries, changed, number),
  );
  registerSessionPages(api, deps);
  registerItems(api, { deps, summaries });

  return announcing(deps.storage, changed);
}

type Fills = Omit<Answering, 'toItems'>;

function registerItems(api: Argo, fills: Fills): void {
  const pathOf = issuePathOf(fills.deps);

  const answer =
    (toItems: ToItems): SlotProvider =>
    (request) =>
      answerSessions({ ...fills, toItems }, request);

  api.slots.register(
    sessionRowSlot,
    answer((e) => rowItems(pathOf, e)),
  );
  api.slots.register(
    sessionBarSlot,
    answer((e) => barItems(pathOf, e)),
  );
}

type SlotProvider = (request: Request) => Promise<Answered>;

type Answered = Record<string, ReturnType<ToItems>>;

const slotsChanged = (api: Argo) => async (): Promise<void> => {
  await Promise.all([
    api.slots.changed(sessionRowSlot),
    api.slots.changed(sessionBarSlot),
  ]);
};

function announceStatus(
  summaries: IssueSummaries,
  changed: () => Promise<void>,
  number: number,
): void {
  summaries.stale(number);
  void changed();
}

const issuePathOf =
  (deps: IssueDeps): PathOf =>
  ({ projectId, number }) =>
    deps.pages.issuePagePath({ id: projectId }, number);

type Answering = {
  deps: IssueDeps;
  summaries: IssueSummaries;
  toItems: ToItems;
};

// One batched call: each Session asked about that has an Issue, with its items; one without has no key.
async function answerSessions(
  { deps, summaries, toItems }: Answering,
  { contexts }: Request,
): Promise<Answered> {
  const sessionIds = contexts.map(({ sessionId }) => sessionId);
  const links = await deps.storage.sessionLinks(sessionIds);

  summaries.refresh(links);

  const grouped = groupBySession(await withSummaries(summaries, links));

  return Object.fromEntries(
    [...grouped].map(([id, linked]) => [id, toItems(linked)]),
  );
}

const withSummaries = (
  summaries: IssueSummaries,
  links: IssueLink[],
): Promise<Linked[]> =>
  Promise.all(
    links.map(async (link) => ({
      link,
      summary: await summaries.cached(link),
    })),
  );

function groupBySession(entries: Linked[]): Map<string, Linked[]> {
  const grouped = new Map<string, Linked[]>();

  for (const entry of entries) {
    const key = entry.link.sessionId;

    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  return grouped;
}

function announcing(
  storage: Attachments,
  changed: () => Promise<void>,
): Attachments {
  return {
    attachSession: async (link) => {
      await storage.attachSession(link);
      await changed();
    },
    detachSession: async (link) => {
      await storage.detachSession(link);
      await changed();
    },
  };
}
