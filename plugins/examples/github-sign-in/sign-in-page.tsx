import {
  Screen,
  Stack,
  Text,
  type Argo,
  type LoaderPage,
  type OAuthFlow,
} from '@argo/plugin-kit';
import { accountHost } from './account-host';
import { Body } from './sign-in-body';
import { chooseView, type SignInData } from './sign-in-view';

/*
 * The sign-in page (ADR-0050): the Loader reads this Project's Account and the flow's state, and the
 * Render draws them; its buttons run the Plugin's Operations, and the flow's `argo.changed()` redraws it.
 */
export function signInPage(
  argo: Pick<Argo, 'accounts'>,
  signIn: OAuthFlow,
): LoaderPage<Record<never, never>, SignInData> {
  return {
    load: async ({ context }) => ({
      // A failed read is the same as no Account: signing in is the way forward.
      account: await argo.accounts.get(accountHost).catch(() => null),
      serverDevice: context.serverDevice,
      flow: signIn.state(),
    }),
    render: (data, to) => (
      <Screen title="Plugin sign-in">
        <Stack direction="column" gap={6}>
          <Text role="title">GitHub</Text>
          <Body
            view={chooseView(data)}
            start={to.run('signIn', {})}
            cancel={to.run('cancelSignIn', {})}
          />
        </Stack>
      </Screen>
    ),
  };
}
