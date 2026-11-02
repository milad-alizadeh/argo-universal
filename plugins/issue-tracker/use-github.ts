import { useMemo } from '@argo/plugin-kit';
import { github } from './github-account';
import {
  readGraphql,
  type GitHubQuery,
  type GitHubRead,
  type RawRead,
} from './github-api';
import type { Json } from './json';

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
 * and the answer is shared with every other view that asks the same question. Inside a `SignInGate` it never sees
 * a missing Account or a rejected token, which the gate answers with the sign-in.
 */
export function useGitHub<Value>(
  { projectId, query }: Source,
  map: (data: Json) => Value,
): GitHubData<Value> {
  const { data, error, refresh } = github.useData(query, {
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

export const readMessage = (read: GitHubRead<unknown>): string | undefined =>
  read.kind === 'failed' ? read.message : undefined;
