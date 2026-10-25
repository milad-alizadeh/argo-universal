import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { createSignIn, provideAccount } from './github-oauth';
import { SignInPage } from './sign-in-page';

// The reference sign-in page: copy this Plugin, change the host, URLs and token handling (docs/plugins/authoring.md).
export async function register(argo: Argo): Promise<void> {
  const signIn = createSignIn(argo);

  function Page(
    props: Pick<Parameters<typeof SignInPage>[0], 'context'>,
  ): JSX.Element {
    return <SignInPage {...props} accounts={argo.accounts} signIn={signIn} />;
  }

  // The page named in `contributes.accounts`, registered before registration completes.
  argo.pages.register('/sign-in', Page);
  // The handler other Plugins borrow through `argo.fetch(url, { account })`.
  await provideAccount(argo);
}
