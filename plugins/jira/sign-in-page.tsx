import {
  Button,
  FieldGroup,
  Screen,
  Stack,
  Text,
  type Argo,
  type PageTo,
  type PluginProps,
  type TokenPasteState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { tokenPageUrl, tokenScopes } from './atlassian';
import { atlassianOffer, type SignIns } from './atlassian-sign-in';
import {
  atlassianSection,
  type AtlassianOffer,
  type AtlassianRuns,
} from './atlassian-sign-in-section';
import type { JiraSignIn } from './jira-sign-in';

// The page `contributes.accounts` names.
export const signInPath = '/sign-in';

// The email and site are not secret, so they wait in Page state for the paste that sends them with the token.
type SignInState = { email: string; site: string };

type To = PageTo<SignInState>;

type SignInData = {
  state: TokenPasteState;
  error: string | null;
  atlassian: AtlassianOffer;
};

const flowError = (state: TokenPasteState): string | null =>
  state.kind === 'failed' ? state.message : null;

const errorOf = (signIn: JiraSignIn): string | null =>
  signIn.notice() ?? flowError(signIn.flow.state());

const signedIn = (label: string, to: To): JSX.Element => (
  <Screen title="Jira">
    <Stack direction="column" gap={6}>
      <Text role="secondary">{`Signed in as ${label}`}</Text>
      <Text role="secondary">Manage this Account in Settings › Accounts.</Text>
      <Button label="Open Jira" onPress={to.go('/')} />
    </Stack>
  </Screen>
);

type Field = PluginProps['FieldGroup.TextField'];

const emailField = (state: SignInState, to: To): Field => ({
  title: 'Email',
  value: state.email,
  placeholder: 'you@example.com',
  keyboardType: 'email-address',
  onChangeText: to.bind('email'),
});

const siteField = (state: SignInState, to: To): Field => ({
  title: 'Site',
  value: state.site,
  placeholder: 'your-team.atlassian.net',
  keyboardType: 'url',
  onChangeText: to.bind('site'),
});

const accountSection = (state: SignInState, to: To): JSX.Element => (
  <FieldGroup.Section key="account" title="Your Atlassian account">
    <FieldGroup.TextField key="email" {...emailField(state, to)} />
    <FieldGroup.TextField key="site" {...siteField(state, to)} />
  </FieldGroup.Section>
);

const errorProps = (error: string | null): { error?: string } =>
  error ? { error } : {};

// The pasted token goes only to `signIn`'s secret `token` param, with the email and site already typed.
const tokenField = (state: SignInState, data: SignInData, to: To): Field => ({
  title: 'API token',
  value: '',
  placeholder: 'Paste a scoped Atlassian API token',
  onChangeText: to.run('signIn', { ...state, token: to.payload() }),
  ...errorProps(data.error),
});

const tokenSection = (
  state: SignInState,
  data: SignInData,
  to: To,
): JSX.Element => (
  <FieldGroup.Section
    key="token"
    title="API token"
    footer={data.error ?? undefined}
  >
    <FieldGroup.SecretField key="token" {...tokenField(state, data, to)} />
  </FieldGroup.Section>
);

const scopeText = `Choose “Create API token with scopes”, pick Jira, and select ${tokenScopes.join(', ')}.`;

const tokenLink = (
  <FieldGroup.Section key="make" title="Make a token" footer={scopeText}>
    <FieldGroup.Link
      key="token-page"
      title="Create an API token"
      onPress={{ action: 'openUrl', url: tokenPageUrl }}
    />
  </FieldGroup.Section>
);

const introduction =
  'Paste a scoped Atlassian API token with the email and Jira site it belongs to. Argo keeps it in your computer’s secret store.';

const signInFields = (
  data: SignInData,
  to: To,
  state: SignInState,
): JSX.Element => (
  <FieldGroup>
    {accountSection(state, to)}
    {tokenSection(state, data, to)}
    {tokenLink}
  </FieldGroup>
);

const atlassianRuns = (to: To): AtlassianRuns => ({
  start: to.run('signInWithAtlassian', {}),
  cancel: to.run('cancelSignInWithAtlassian', {}),
});

const signInForm = (
  data: SignInData,
  to: To,
  state: SignInState,
): JSX.Element => (
  <Screen title="Sign in to Jira">
    <Stack direction="column" gap={6}>
      <Text role="secondary">{introduction}</Text>
      {signInFields(data, to, state)}
      {atlassianSection(data.atlassian, atlassianRuns(to))}
    </Stack>
  </Screen>
);

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
