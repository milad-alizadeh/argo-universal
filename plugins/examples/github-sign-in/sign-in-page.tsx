import {
  Screen,
  Stack,
  Text,
  type Argo,
  type LoaderPage,
  type OAuthFlow,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { accountHost } from './account-host';
import { Body, type Actions } from './sign-in-body';
import { chooseView, type SignInData, type SignInView } from './sign-in-view';

/*
 * The sign-in page (ADR-0050): the Loader reads this Project's Account and the flow's state, and the
 * Render draws them; its buttons run the Plugin's Operations, and the flow's `argo.changed()` redraws it.
 */
export function signInPage(
  argo: Pick<Argo, 'accounts'>,
  signIn: OAuthFlow,
): LoaderPage<Record<never, never>, SignInData> {
  return {
    load: ({ context }) => signInData(argo, signIn, context.serverDevice),
    render: (data, to) => (
      <SignInScreen
        view={chooseView(data)}
        start={to.run('signIn', {})}
        cancel={to.run('cancelSignIn', {})}
      />
    ),
  };
}

async function signInData(
  argo: Pick<Argo, 'accounts'>,
  signIn: OAuthFlow,
  serverDevice: boolean,
): Promise<SignInData> {
  return {
    // A failed read is the same as no Account: signing in is the way forward.
    account: await argo.accounts.get(accountHost).catch(() => null),
    serverDevice,
    flow: signIn.state(),
  };
}

function SignInScreen(props: Actions & { view: SignInView }): JSX.Element {
  return (
    <Screen title="Plugin sign-in">
      <Stack direction="column" gap={6}>
        <Text role="title">GitHub</Text>
        <Body {...props} />
      </Stack>
    </Screen>
  );
}
