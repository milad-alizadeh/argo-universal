import {
  accountFetch,
  oauthFlow,
  provideSignIn,
  Screen,
  signInGate,
  Text,
  tokenPaste,
  type Argo,
  type GatedPage,
  type PageState,
} from '@argo/plugin-kit';

const host = 'api.service.example';

const service = { name: 'Service' };

// The one read of the page: the Account is borrowed, so a signed-out person has no answer.
const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: async () =>
    (await accountFetch(argo, host)(`https://${host}/items`)).text(),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

// The fixture service expects Basic auth for pasted tokens and Bearer auth for OAuth.
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Fixture emails and tokens are ASCII.
const digit = (value: number): string => alphabet.charAt(value);

function encodeGroup(text: string, index: number): string {
  const first = text.charCodeAt(index);
  const second = text.charCodeAt(index + 1);
  const third = text.charCodeAt(index + 2);
  const a = digit(first >> 2);
  const b = digit(((first & 3) << 4) | (second >> 4));

  const c = Number.isNaN(second)
    ? '='
    : digit(((second & 15) << 2) | (third >> 6));

  const d = Number.isNaN(third) ? '=' : digit(third & 63);

  return a + b + c + d;
}

function basic({ email, token }: { email: string; token: string }): string {
  const text = `${email}:${token}`;
  let encoded = '';

  for (let index = 0; index < text.length; index += 3)
    encoded += encodeGroup(text, index);

  return `Basic ${encoded}`;
}

function login(argo: Argo): (authorization: string) => Promise<string | null> {
  return async (authorization) => {
    const reply = await argo.fetch(`https://${host}/me`, {
      headers: { Authorization: authorization },
    });

    return reply?.ok ? reply.text() : null;
  };
}

const oauth = (
  argo: Argo,
  label: ReturnType<typeof login>,
): ReturnType<typeof oauthFlow> =>
  oauthFlow(argo, {
    host,
    clientId: 'fixture-client',
    authorizeUrl: `https://${host}/authorize`,
    tokenUrl: `https://${host}/token`,
    label: (token) => label(`Bearer ${token}`),
  });

export async function register(argo: Argo): Promise<void> {
  const label = login(argo);

  const paste = tokenPaste(argo, {
    host,
    header: { header: 'Authorization', prefix: '' },
    fields: [{ key: 'email', title: 'Email' }],
    label: (token, fields) =>
      label(basic({ token, email: fields.email ?? '' })),
    credential: ({ token, email }) => basic({ token, email: email ?? '' }),
  });

  const flows = [paste, oauth(argo, label)] as const;

  await provideSignIn(argo, flows, service);
  argo.pages.define('/', signInGate(flows, service, itemsPage(argo)));
}
