import {
  useCallback,
  useData,
  useEffect,
  usePageContext,
  useState,
  type PluginProps,
  type UseDataResult,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { DefinedAccount } from './define-account';
import {
  GateContext,
  needOf,
  type Blocked,
  type FetchQuery,
} from './gate-context';
import { SignInPage } from './sign-in-page';
import type { SignInNeed } from './steps';

type GateProps = {
  account: DefinedAccount;
  children: PluginProps['Stack']['children'];
};

// How often a page waiting at the sign-in looks again, for an Account signed in elsewhere.
const recheckMs = 60_000;

type InPlaceProps = {
  account: DefinedAccount;
  blocked: Blocked;
  answered: () => void;
};

type Read = UseDataResult<FetchQuery>;

const settled = ({ data, error }: Read): boolean =>
  data !== undefined || error !== undefined;

const hasAnswered = (read: Read, need: SignInNeed | null): boolean =>
  need === null && !read.stale && settled(read);

type HeldRead = { need: SignInNeed; refresh: () => Promise<void> };

function useHeldRead({ blocked, answered }: InPlaceProps): HeldRead {
  const read = useData(blocked.query, { every: recheckMs, ...blocked.options });
  const need = needOf(read);
  const back = hasAnswered(read, need);

  useEffect(() => {
    if (back) answered();
  }, [back, answered]);

  return { need: need ?? blocked.need, refresh: read.refresh };
}

/*
 * Holds the read that could not answer while the sign-in is up. Its answer is what the page's own read will find, so the
 * page returns only once that answer is good and never bounces back on the old one. It is the same Query entry, so this
 * makes no call the page would not have made.
 */
function SignInInPlace(props: InPlaceProps): JSX.Element {
  const { need, refresh } = useHeldRead(props);
  const page = usePageContext();

  return (
    <SignInPage
      account={props.account}
      need={need}
      projectId={props.blocked.options?.projectId ?? page.projectId}
      onSignedIn={refresh}
    />
  );
}

type BlockedState = {
  blocked: Blocked | null;
  report: (next: Blocked) => void;
  answered: () => void;
};

function useBlocked(): BlockedState {
  const [blocked, setBlocked] = useState<Blocked | null>(null);

  const report = useCallback((next: Blocked): void => {
    setBlocked((now) => now ?? next);
  }, []);

  const answered = useCallback((): void => setBlocked(null), []);

  return { blocked, report, answered };
}

/*
 * Draws its children until a read inside them, through `account.useData`, has no Account or a rejected token; then the
 * sign-in takes their place until a read answers again.
 */
export function SignInGate({ account, children }: GateProps): JSX.Element {
  const { blocked, report, answered } = useBlocked();

  return (
    <GateContext.Provider value={report}>
      {blocked ? (
        <SignInInPlace {...{ account, blocked, answered }} />
      ) : (
        children
      )}
    </GateContext.Provider>
  );
}
