import { useData, useMemo } from '@argo/plugin-kit';
import {
  readGraphql,
  type GitHubQuery,
  type GitHubRead,
  type RawRead,
} from './github-api';

/*
 * How long a GitHub answer is fresh. A page opened again inside it makes no call; a sign-out or a rejected token is
 * noticed within it (ADR-0037).
 */
export const freshForMs = 60_000;

type Source = { projectId: string; query: GitHubQuery | null };

export type GitHubData<Value> = {
  read: GitHubRead<Value>;
  refresh: () => Promise<void>;
};

/*
 * A GitHub read through `useData`: the Project it reads for is named, as the tracker's pages have none of their own,
 * and the answer is shared with every other view that asks the same question.
 */
export function useGitHub<Value>(
  { projectId, query }: Source,
  map: (data: unknown) => Value,
): GitHubData<Value> {
  const { data, error, refresh } = useData(query, {
    projectId,
    every: freshForMs,
  });

  const raw: RawRead = useMemo(
    () => ({ data: data && { status: data.status, body: data.body }, error }),
    [data, error],
  );

  const read = useMemo(() => readGraphql(raw, map), [raw, map]);

  return { read, refresh };
}

// A read that wants the sign-in page instead of the page: no Account, or a token GitHub rejected.
export type SignInNeed = { reauthorize: boolean };

export function signInNeed(read: GitHubRead<unknown>): SignInNeed | null {
  if (read.kind === 'signed-out') return { reauthorize: false };

  return read.kind === 'unauthorized' ? { reauthorize: true } : null;
}

export const readMessage = (read: GitHubRead<unknown>): string | undefined =>
  read.kind === 'failed' ? read.message : undefined;
