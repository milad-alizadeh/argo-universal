import type {
  TokenPasteArgo,
  TokenPasteOptions,
  TokenPastePattern,
  TokenPasteState,
} from '@repo/contracts/plugins/token-paste-api';

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
  const held: Held = { state: idle, paste: null };

  return Object.freeze({
    serverDevice: false,
    pastesToken: true,
    state: () => held.state,
    start: (token: string) => pasted(held, { argo, options }, token.trim()),
    cancel: () => {
      held.paste = null;

      return settle(held, argo, idle);
    },
    provide: () =>
      argo.accounts.provide(options.host, options.header, (account) =>
        argo.secrets.get(account.id),
      ),
  });
};

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
 * A newer paste replaces this one, whose check then changes nothing: a person typing a token sends each edit, and
 * only the last one counts. An empty field is no token at all.
 */
async function pasted(
  held: Held,
  given: Given,
  token: string,
): Promise<TokenPasteState> {
  const mine = Symbol('paste');

  held.paste = mine;

  if (!token) return settle(held, given.argo, idle);

  const state = await checked(given, token, () => held.paste === mine);

  return held.paste === mine ? settle(held, given.argo, state) : held.state;
}

// The service's answer to the token; one it refuses, or that cannot be checked, says why instead.
async function checked(
  { argo, options }: Given,
  token: string,
  live: () => boolean,
): Promise<TokenPasteState> {
  const label = await options.label(token).then(
    (named) => named || rejected(notAccepted),
    () => rejected(unchecked),
  );

  if (typeof label !== 'string') return label;

  // A newer paste is being checked, so this one adds no Account.
  if (!live()) return idle;

  // Argo mints the Account id and reuses the row of a person who signs in again; the token is kept under it.
  const id = await argo.accounts.add(options.host, { label });

  await argo.secrets.set(id, token);

  return { kind: 'signed-in', label };
}
