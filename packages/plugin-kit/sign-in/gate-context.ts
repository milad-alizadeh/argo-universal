import {
  createContext,
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

const isRejected = (data: Read['data']): boolean =>
  data?.status === unauthorized;

// A borrow that returned nothing, or a token the service refused; a 401 is data the Plugin reads (ADR-0037).
export function needOf({ data, errorKind }: Read): SignInNeed | null {
  if (errorKind === 'no-account') return 'no-account';

  return isRejected(data) ? 'rejected' : null;
}
