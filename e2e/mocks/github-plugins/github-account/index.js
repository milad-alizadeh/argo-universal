import { Text } from '@argo/plugin-kit';

// The one token the fixture GitHub accepts; the Plugin that borrows the Account never sees it.
const token = 'fixture-token';

/*
 * A signed-in GitHub Account with no sign-in to drive: the Plugin provides `api.github.com` with a fixed token, as the
 * Issue tracker does after its device flow, so the GitHub Plugin borrows it the way it does in the App.
 */
export async function register(argo) {
  argo.pages.define('/sign-in', {
    load: () => null,
    render: () => <Text>Signed in to the fixture GitHub</Text>,
  });
  argo.operations.register('ready', () => true);
  await argo.accounts.add('api.github.com', { label: 'fixture' });
  await argo.accounts.provide(
    'api.github.com',
    { header: 'Authorization', prefix: 'Bearer' },
    () => token,
  );
}
