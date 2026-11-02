import {
  useContext,
  useData,
  useEffect,
  usePageContext,
  type UseDataOptions,
  type UseDataResult,
} from '@argo/plugin-kit';
import {
  GateContext,
  needOf,
  readProject,
  type Blocked,
  type FetchQuery,
} from './gate-context';
import type { SignInNeed } from './steps';

// A read through the Account: what `useData` takes for a fetch, less what the Account already says.
export type AccountRead = Omit<FetchQuery, 'api' | 'account'>;

const queryOf = (host: string, read: AccountRead | null): FetchQuery | null =>
  read && { ...read, api: 'fetch', account: host };

const blockedOf = (
  query: FetchQuery | null,
  options: UseDataOptions | undefined,
  need: SignInNeed | null,
): Blocked | null => (query && need ? { query, options, need } : null);

// What the page sees while the gate draws the sign-in: nothing yet, as the page does not have to handle either.
const held = (
  result: UseDataResult<FetchQuery>,
): UseDataResult<FetchQuery> => ({
  ...result,
  data: undefined,
  error: undefined,
  errorKind: undefined,
  stale: true,
});

export function useAccountRead(
  host: string,
  read: AccountRead | null,
  options?: UseDataOptions,
): UseDataResult<FetchQuery> {
  const query = queryOf(host, read);
  const result = useData(query, options);
  const report = useContext(GateContext);
  const projectId = readProject(options, usePageContext());
  const blocked = blockedOf(query, options, needOf(result, projectId));

  useEffect(() => {
    if (report && blocked) report(blocked);
  }, [report, blocked]);

  return report && blocked ? held(result) : result;
}
