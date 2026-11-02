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

/*
 * A borrow that returned nothing, or a token the service refused; a 401 is data the Plugin reads (ADR-0037). An Account's
 * read refused with no Project is several Accounts and nothing to choose between them (ADR-0036): a page's own Capabilities
 * cover its Account's host, and only a read that names a Project can be refused for that Project.
 */
export function needOf(
  { data, errorKind }: Read,
  projectId: string | undefined,
): SignInNeed | null {
  if (errorKind === 'no-account') return 'no-account';

  if (errorKind === 'refused' && projectId === undefined)
    return 'several-accounts';

  return isRejected(data) ? 'rejected' : null;
}
