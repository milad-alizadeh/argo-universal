import type {
  TokenLabel,
  TokenPaste,
  TokenPasteArgo,
  TokenPasteOptions,
  TokenPastePattern,
  TokenPasteState,
} from '@repo/contracts/plugins/token-paste-api';
import { flowCredential } from './sign-in-credentials';
import { checkedFields, inputOf, type Input } from './token-paste-fields';

// The one sign-in a token paste holds, and the paste whose check still counts.
type Held = { state: TokenPasteState; paste: symbol | null };

type Given = { argo: TokenPasteArgo; options: TokenPasteOptions };

const idle: TokenPasteState = { kind: 'idle' };

const rejected = (message: string): TokenPasteState => ({
  kind: 'failed',
  reason: 'rejected',
  message,
});

const notAccepted = 'This token wasn’t accepted. Check it and paste it again.';

// The Plugin's own error may name the token, and the page draws this, so it says only what happened.
const unchecked =
  'Couldn’t check the token. Check your connection and paste it again.';

/*
 * A kit pattern on the open `argo.accounts` and `argo.secrets` calls: check a pasted token with the Plugin's
 * `label`, add the Account and keep the token under its id, saying `argo.changed()` at each step so the pages that
 * draw the state redraw. The token reaches the kit as a secret Operation param, so it is never logged or answered.
 */
export const tokenPaste: TokenPastePattern = (argo, options) => {
  const credential = flowCredential(
    argo.secrets,
    options,
    (secrets) =>
      (account): Promise<string | null> =>
        secrets.get(account.id),
  );

  const given = { argo: { ...argo, secrets: credential.keeping }, options };

  return credential.attach(
    Object.freeze(pasteFlow(given, () => provide({ argo, options }))),
  );
};

function pasteFlow(given: Given, register: TokenPaste['provide']): TokenPaste {
  const fields = checkedFields(given.options.fields ?? []);
  const held: Held = { state: idle, paste: null };

  return {
    serverDevice: false,
    pastesToken: true,
    fields,
    state: () => held.state,
    start: (token, values = {}) =>
      pasted(held, given, inputOf(fields, token, values)),
    cancel: () => forget(held, given.argo),
    provide: register,
  };
}

function forget(held: Held, argo: TokenPasteArgo): TokenPasteState {
  held.paste = null;

  return settle(held, argo, idle);
}

// A borrower's request gets the kept token in the header the Plugin names; Argo sets it.
const provide = ({ argo, options }: Given): Promise<void> =>
  argo.accounts.provide(options.host, options.header, (account) =>
    argo.secrets.get(account.id),
  );

function settle(
  held: Held,
  argo: TokenPasteArgo,
  state: TokenPasteState,
): TokenPasteState {
  held.state = state;
  argo.changed();

  return state;
}

/*
 * Text shorter than this is no API token any service issues, so it is not sent to be checked: a person typing a token
 * by hand does not spend the service's patience on its first characters, and an emptied field shows no error.
 */
const shortestToken = 8;

/*
 * A newer paste replaces this one, whose check then changes nothing: a person typing a token sends each edit, and
 * only the last one counts.
 */
async function pasted(
  held: Held,
  given: Given,
  input: Input,
): Promise<TokenPasteState> {
  const mine = Symbol('paste');

  held.paste = mine;

  if (input.token.length < shortestToken) return settle(held, given.argo, idle);

  const state = await checked(given, input, () => held.paste === mine);

  return held.paste === mine ? settle(held, given.argo, state) : held.state;
}

/*
 * Why a token was refused: the Plugin's own words when it gave them, unless they hold the token, since the page
 * draws them.
 */
function refusal(named: TokenLabel, token: string): TokenPasteState {
  const said = refusedSaying(named);
  const shown = said !== '' && !said.includes(token);

  return rejected(shown ? said : notAccepted);
}

const refusedSaying = (named: TokenLabel): string =>
  typeof named === 'object' && named !== null ? named.refused : '';

const acceptedLabel = (
  named: TokenLabel,
  token: string,
): string | TokenPasteState =>
  (typeof named === 'string' && named) || refusal(named, token);

// The service's answer to the token; one it refuses, or that cannot be checked, says why instead.
async function checked(
  given: Given,
  input: Input,
  live: () => boolean,
): Promise<TokenPasteState> {
  const { token, fields } = input;

  const label = await Promise.resolve()
    .then(() => given.options.label(token, fields))
    .then(
      (named) => acceptedLabel(named, token),
      () => rejected(unchecked),
    );

  if (typeof label !== 'string') return label;

  return live() ? keepCredential(given, { ...input, label }, live) : idle;
}

function keepCredential(
  given: Given,
  input: Input & { label: string },
  live: () => boolean,
): Promise<TokenPasteState> {
  const { token, fields, label } = input;
  let credential: string;

  try {
    credential = credentialOf(given.options, { token, fields });
  } catch {
    return Promise.resolve(rejected(unchecked));
  }

  return kept(given, { token: credential, label }, live);
}

const credentialOf = (
  options: TokenPasteOptions,
  { token, fields }: Input,
): string =>
  options.credential ? options.credential({ ...fields, token }) : token;

// Argo mints the Account id and reuses the row of a person who signs in again; the token is kept under it.
async function kept(
  { argo, options }: Given,
  { token, label }: { token: string; label: string },
  live: () => boolean,
): Promise<TokenPasteState> {
  const id = await argo.accounts.add(options.host, { label });

  /*
   * Overtaken while the Account was added: the newer paste keeps its own token, so this one keeps none. Argo has no
   * call to take the row back; it is the same row unless the two tokens open different Accounts.
   */
  if (!live()) return idle;

  await argo.secrets.set(id, token);

  return { kind: 'signed-in', label, accountId: id };
}
