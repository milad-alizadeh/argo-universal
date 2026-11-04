import type { Argo } from '@argo/plugin-kit';
import { githubSignIn } from './github';
import { signInPage } from './sign-in-page';

// The reference sign-in page: copy this Plugin and change `github.ts` for another service (docs/plugins/authoring.md).
export async function register(argo: Argo): Promise<void> {
  const signIn = githubSignIn(argo);

  // The Operations the page's buttons run; a person taps them on the Server Device.
  argo.operations.register('signIn', () => signIn.start());
  argo.operations.register('cancelSignIn', () => signIn.cancel());
  // The page named in `contributes.accounts`, defined before registration completes.
  argo.pages.define('/sign-in', signInPage(argo, signIn));
  // The handler other Plugins borrow through `argo.fetch(url, { account })`.
  await signIn.provide();
}
