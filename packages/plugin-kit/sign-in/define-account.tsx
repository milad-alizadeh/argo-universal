import type {
  Argo,
  ReadDataOptions,
  ReadDataResult,
  UseDataOptions,
  UseDataResult,
} from '@argo/plugin-kit';
import { accountQuery, useAccountRead, type AccountRead } from './account-read';
import { runDeviceFlow } from './device-flow';
import type { Settled } from './device-poll';
import type { FetchQuery } from './gate-context';
import { runRedirectFlow } from './redirect-flow';
import { saveAccount, type LabelSource } from './save-account';
import { SignInPage } from './sign-in-page';
import { failed, type StartedRun } from './steps';
import { createTokenSource } from './tokens';

export type { AccountRead };

type Common = {
  // The API host the token opens, which names the Account (ADR-0036).
  host: string;
  // The service's name, as the sign-in page says it.
  name: string;
  // Public by design: a client ID is not a secret, and it ships in the Plugin.
  clientId: string;
  scope?: string;
  label: LabelSource;
  // The page `contributes.accounts` names; `/sign-in` unless it says otherwise.
  page?: string;
  tokenUrl: string;
};

// Two flows. A service that demands a client secret stays on `argo.oauth` and `argo.accounts`, as Argo ships no secrets.
export type AccountDeclaration = Common &
  (
    | { flow: 'device'; deviceUrl: string }
    | { flow: 'redirect'; authorizeUrl: string }
  );

export type DefinedAccount = {
  declaration: AccountDeclaration;
  // Call once inside the Plugin's `register`: it provides the Account and registers its sign-in page.
  register: (argo: Argo) => Promise<void>;
  // `useData` for a page inside a `SignInGate`: no Account, a 401 or several Accounts with no Project draw in its place.
  useData: (
    query: AccountRead | null,
    options?: UseDataOptions,
  ) => UseDataResult<FetchQuery>;
  // The same read once, where no view can watch it, such as an items Slot's provider. A page's `useData` shares its entry.
  read: (
    query: AccountRead,
    options: ReadDataOptions,
  ) => Promise<ReadDataResult<FetchQuery>>;
  // Runs one sign-in for the page that asked; the sign-in page calls this.
  signIn: (run: StartedRun) => Promise<void>;
};

const defaultPage = '/sign-in';

// A token goes only to the Account's own host, as a borrow's does (ADR-0036).
function requireLabelOnHost({ host, label }: AccountDeclaration): void {
  if (!label.url.startsWith(`https://${host}/`))
    throw new Error(
      `defineAccount: label.url must be on https://${host}/, as the token opens only that host. Got ${label.url}.`,
    );
}

const flowOf = (
  argo: Argo,
  declaration: AccountDeclaration,
  run: StartedRun,
): Promise<Settled> =>
  declaration.flow === 'device'
    ? runDeviceFlow(argo, declaration, run)
    : runRedirectFlow(argo, declaration, run);

async function attempt(
  argo: Argo,
  declaration: AccountDeclaration,
  run: StartedRun,
): Promise<void> {
  const settled = await flowOf(argo, declaration, run);

  if (run.cancelled()) return;

  if (settled.kind !== 'token') return run.show(settled);

  const { tokens } = settled;
  const { projectId } = run;
  const label = await saveAccount(argo, declaration, { tokens, projectId });

  run.show({ kind: 'signed-in', label });
}

const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

async function runSignIn(
  argo: () => Argo,
  declaration: AccountDeclaration,
  run: StartedRun,
): Promise<void> {
  run.show({ kind: 'requesting' });

  await attempt(argo(), declaration, run).catch((cause: unknown) => {
    if (!run.cancelled()) run.show(failed(messageOf(cause)));
  });
}

async function provideAccount(
  argo: Argo,
  account: DefinedAccount,
): Promise<void> {
  const { declaration } = account;
  const token = createTokenSource(argo, declaration);

  argo.pages.register(declaration.page ?? defaultPage, () => (
    <SignInPage account={account} />
  ));
  await argo.accounts.provide(
    declaration.host,
    { header: 'Authorization', prefix: 'Bearer' },
    ({ id }) => token(id),
  );
}

type Registered = { set: (argo: Argo) => void; get: () => Argo };

function registeredArgo(host: string): Registered {
  let held: Argo | null = null;

  return {
    set: (argo) => {
      held = argo;
    },
    get: () => {
      if (held) return held;

      throw new Error(
        `Call \`await account.register(argo)\` for ${host} inside your Plugin's \`register\` first.`,
      );
    },
  };
}

/*
 * One service's sign-in, declared once. Everything runs in the Plugin's own worker through the public API (ADR-0036):
 * Argo holds no provider list and no secret, and the Plugin's own code never sees a token.
 */
export function defineAccount(declaration: AccountDeclaration): DefinedAccount {
  requireLabelOnHost(declaration);

  const argo = registeredArgo(declaration.host);

  const account: DefinedAccount = {
    declaration,
    register: async (given) => {
      argo.set(given);
      await provideAccount(given, account);
    },
    useData: (read, options) => useAccountRead(declaration.host, read, options),
    read: (read, options) =>
      argo.get().data.read(accountQuery(declaration.host, read), options),
    signIn: (run) => runSignIn(argo.get, declaration, run),
  };

  return account;
}
