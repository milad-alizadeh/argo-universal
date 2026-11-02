import {
  createContext,
  type PluginRenderContext,
  type PluginQuery,
  type UseDataOptions,
  type UseDataResult,
} from '@argo/plugin-kit';
import type { SignInNeed } from './steps';

export type FetchQuery = Extract<PluginQuery, { api: 'fetch' }>;

// What a page's read told the gate: the read itself, so the gate can keep asking it, and why it could not answer.
export type Blocked = {
  query: FetchQuery;
  options: UseDataOptions | undefined;
  need: SignInNeed;
};

export const GateContext = createContext<((blocked: Blocked) => void) | null>(
  null,
);

const unauthorized = 401;

type Read = Pick<UseDataResult<FetchQuery>, 'data' | 'errorKind'>;

// The Project a read answers for: the one it names, else the page's.
export const readProject = (
  options: UseDataOptions | undefined,
  { projectId }: Pick<PluginRenderContext, 'projectId'>,
): string | undefined => options?.projectId ?? projectId;

const isRejected = (data: Read['data']): boolean =>
  data?.status === unauthorized;

type ErrorKind = Read['errorKind'];

/*
 * An Account's read refused with no Project is several Accounts and nothing to choose between them (ADR-0036): the page's
 * Capabilities cover its Account's host, and only a read that names a Project can be refused for that Project.
 */
const severalAccounts = (
  errorKind: ErrorKind,
  projectId: string | undefined,
): boolean => errorKind === 'refused' && projectId === undefined;

function needOfError(
  errorKind: ErrorKind,
  projectId: string | undefined,
): SignInNeed | null {
  if (errorKind === 'no-account') return 'no-account';

  return severalAccounts(errorKind, projectId) ? 'several-accounts' : null;
}

// A borrow that returned nothing, several Accounts, or a token the service refused; a 401 is data the Plugin reads (ADR-0037).
export const needOf = (
  { data, errorKind }: Read,
  projectId: string | undefined,
): SignInNeed | null =>
  needOfError(errorKind, projectId) ?? (isRejected(data) ? 'rejected' : null);
