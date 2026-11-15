import {
  Button,
  FieldGroup,
  Screen,
  Stack,
  Text,
  type Argo,
  type LoaderPage,
  type TokenPasteState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { tokenPageUrl, tokenScopes } from './atlassian';
import { oauthReady, type SignIns } from './atlassian-sign-in';
import {
  atlassianSection,
  type AtlassianOffer,
} from './atlassian-sign-in-section';
import type { JiraSignIn } from './jira-sign-in';

// The page `contributes.accounts` names.
export const signInPath = '/sign-in';

// The email and site are not secret, so they wait in Page state for the paste that sends them with the token.
type SignInState = { email: string; site: string };

type SignInData = {
  state: TokenPasteState;
  error: string | null;
  atlassian: AtlassianOffer;
};

const errorOf = (signIn: JiraSignIn): string | null => {
  const state = signIn.flow.state();

  return signIn.notice() ?? (state.kind === 'failed' ? state.message : null);
};

const signedIn = (label: string, to: PageTo): JSX.Element => (
  <Screen title="Jira">
    <Stack direction="column" gap={6}>
      <Text role="secondary">{`Signed in as ${label}`}</Text>
      <Text role="secondary">Manage this Account in Settings › Accounts.</Text>
      <Button label="Open Jira" onPress={to.go('/')} />
    </Stack>
  </Screen>
);

type PageTo = Parameters<LoaderPage<SignInState, SignInData>['render']>[1];

const scopeText = `Choose “Create API token with scopes”, pick Jira, and select ${tokenScopes.join(', ')}.`;

const accountSection = (state: SignInState, to: PageTo): JSX.Element => (
  <FieldGroup.Section key="account" title="Your Atlassian account">
    <FieldGroup.TextField
      key="email"
      title="Email"
      value={state.email}
      placeholder="you@example.com"
      keyboardType="email-address"
      onChangeText={to.bind('email')}
    />
    <FieldGroup.TextField
      key="site"
      title="Site"
      value={state.site}
      placeholder="your-team.atlassian.net"
      keyboardType="url"
      onChangeText={to.bind('site')}
    />
  </FieldGroup.Section>
);

// The pasted token goes only to `signIn`'s secret `token` param, with the email and site already typed.
const tokenSection = (
  state: SignInState,
  error: string | null,
  to: PageTo,
): JSX.Element => (
  <FieldGroup.Section
    key="token"
    title="API token"
    {...(error ? { footer: error } : {})}
  >
    <FieldGroup.SecretField
      key="token"
      title="API token"
      value=""
      placeholder="Paste a scoped Atlassian API token"
      onChangeText={to.run('signIn', {
        email: state.email,
        site: state.site,
        token: to.payload(),
      })}
      {...(error ? { error } : {})}
    />
  </FieldGroup.Section>
);

const tokenLink = (): JSX.Element => (
  <FieldGroup.Section key="make" title="Make a token" footer={scopeText}>
    <FieldGroup.Link
      key="token-page"
      title="Create an API token"
      onPress={{ action: 'openUrl', url: tokenPageUrl }}
    />
  </FieldGroup.Section>
);

const signInForm = (
  data: SignInData,
  to: PageTo,
  state: SignInState,
): JSX.Element => (
  <Screen title="Sign in to Jira">
    <Stack direction="column" gap={6}>
      <Text role="secondary">
        Paste a scoped Atlassian API token with the email and Jira site it
        belongs to. Argo keeps it in your computer’s secret store.
      </Text>
      <FieldGroup>
        {accountSection(state, to)}
        {tokenSection(state, data.error, to)}
        {tokenLink()}
      </FieldGroup>
      {atlassianSection(data.atlassian, {
        start: to.run('signInWithAtlassian', {}),
        cancel: to.run('cancelSignInWithAtlassian', {}),
      })}
    </Stack>
  </Screen>
);

// "Sign in with Atlassian" needs the person's OAuth app, and the Server Device's browser and callback port.
async function atlassianOffer(
  argo: Pick<Argo, 'settings'>,
  { atlassian }: SignIns,
  serverDevice: boolean,
): Promise<AtlassianOffer> {
  if (!(await oauthReady(argo))) return { kind: 'needs-app' };

  return serverDevice
    ? { kind: 'here', state: atlassian.flow.state() }
    : { kind: 'elsewhere' };
}

// Signed in either way, the one the person used last in this run says so.
function signInState({ paste, atlassian }: SignIns): TokenPasteState {
  const oauth = atlassian.flow.state();

  return oauth.kind === 'signed-in' ? oauth : paste.flow.state();
}

/*
 * A token is pasted on any Device, a paired phone included; the kit keeps it and adds the Account. "Sign in with
 * Atlassian" is offered under it once the person has set up their OAuth app.
 */
export function defineSignInPage(argo: Argo, signIns: SignIns): void {
  argo.pages.define(signInPath, {
    state: { email: '', site: '' },
    load: async ({ context }): Promise<SignInData> => ({
      state: signInState(signIns),
      error: errorOf(signIns.paste),
      atlassian: await atlassianOffer(argo, signIns, context.serverDevice),
    }),
    render: (data, to, { state }) =>
      data.state.kind === 'signed-in'
        ? signedIn(data.state.label, to)
        : signInForm(data, to, state),
  });
}
