import { useEffect, useState } from '@argo/plugin-kit';
import type { IssueDeps } from './issue-deps';
import type { Project } from './issue-project';
import type { IssueLink } from './tracker-storage';
import type { Called } from './use-call';

// The Issue a Session is attached to, in the Project it belongs to.
export type Attached = { project: Project; number: number };

type Source = { deps: IssueDeps; sessionId: string | undefined };

type Loaded = Called<Attached | null> & Source;

const waiting = { value: undefined, error: undefined } as const;

/*
 * The Issue this Session was most recently attached to, or `null` when it has none or the page has no Session. It is
 * read again each time an Agent attaches or detaches an Issue, and the last answer stays while the next is read, so a
 * card moving from one Issue to another never draws nothing in between.
 */
export function useSessionIssue(
  deps: IssueDeps,
  sessionId: string | undefined,
): Called<Attached | null> {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => watchLink({ deps, sessionId }, setLoaded), [deps, sessionId]);

  return answers(loaded, { deps, sessionId }) ? loaded : waiting;
}

// An answer read for another Session or other deps is not this page's answer.
const answers = (
  loaded: Loaded | undefined,
  { deps, sessionId }: Source,
): loaded is Loaded => loaded?.deps === deps && loaded.sessionId === sessionId;

type Reads = { latest: number; watching: boolean };

type Settle = (loaded: Loaded) => void;

// Reads the link now and on every change; only the latest read settles, and none once the page has moved on.
function watchLink(source: Source, settle: Settle): () => void {
  const reads: Reads = { latest: 0, watching: true };
  const read = latestRead(source, reads, settle);

  read();
  const stop = source.deps.links.subscribe(read);

  return (): void => {
    reads.watching = false;
    stop();
  };
}

const latestRead =
  (source: Source, reads: Reads, settle: Settle) => (): void => {
    reads.latest += 1;
    const run = reads.latest;

    settleLatest(
      source,
      (loaded) => reads.watching && run === reads.latest && settle(loaded),
    );
  };

function settleLatest(source: Source, settle: Settle): void {
  loadAttached(source).then(
    (value) => settle({ ...source, value, error: undefined }),
    (cause: unknown) =>
      settle({ ...source, value: undefined, error: String(cause) }),
  );
}

// The Issue this Session was most recently attached to, if its Project is still there.
async function loadAttached({
  deps,
  sessionId,
}: Source): Promise<Attached | null> {
  const link = await attachedLink(deps, sessionId);

  return link ? attachedIssue(deps, link) : null;
}

async function attachedLink(
  deps: IssueDeps,
  sessionId: string | undefined,
): Promise<IssueLink | undefined> {
  const [link] =
    sessionId === undefined ? [] : await deps.storage.sessionLinks([sessionId]);

  return link;
}

async function attachedIssue(
  deps: IssueDeps,
  { projectId, number }: { projectId: string; number: number },
): Promise<Attached | null> {
  const projects = await deps.listProjects();
  const project = projects.find(({ id }) => id === projectId);

  return project ? { project, number } : null;
}
