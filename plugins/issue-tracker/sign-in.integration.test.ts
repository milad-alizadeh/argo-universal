import { expect, it } from 'vitest';
import {
  chooseGithub,
  signIn,
  signedInRoot,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';
import {
  apiCalls,
  showsCode,
  signedInText,
  signInLabel,
  until,
} from './sign-in-helpers';

it('shows the code and where to enter it, then names the Account once approved, from a paired Device', async () => {
  const tracked = await trackedGitHub();
  const page = await showsCode(tracked);

  expect(page.findText('Open GitHub')?.node.props.onPress).toEqual({
    action: 'openUrl',
    url: 'https://github.com/login/device',
  });
  await until(tracked, page, signedInText);
  expect(tracked.github.requests.map(({ path }) => path)).toContain(
    '/login/oauth/access_token',
  );
  expect(tracked.test.accounts.list()).toMatchObject([
    { host: 'api.github.com', label: 'octocat' },
  ]);
});

it('keeps waiting through pending and slow_down answers, then signs in', async () => {
  const tracked = await trackedGitHub();

  tracked.github.script(
    { error: 'authorization_pending' },
    { error: 'slow_down' },
    { access_token: 'token-1' },
  );

  const page = await showsCode(tracked);

  await tracked.test.clock.advance(1000);
  await tracked.test.clock.advance(1000);
  await tracked.test.clock.advance(5000);
  await page.draw();
  // The third poll waits five seconds longer after slow_down, so it has not run yet.
  expect(page.findText(signedInText)).toBeUndefined();
  await until(tracked, page, signedInText);
  expect(
    tracked.github.requests.filter(({ path }) => path.endsWith('access_token')),
  ).toHaveLength(3);
});

it('lets the person give up waiting', async () => {
  const tracked = await trackedGitHub();
  const page = await showsCode(tracked);

  await page.press('Cancel');
  await page.draw();
  expect(page.findText(signInLabel)).toBeDefined();
  expect(page.findText('WDJB-MJHT')).toBeUndefined();
});

it('draws the sign-in in place of the Issues page when there is no Account, calling no GitHub API', async () => {
  const tracked = await trackedGitHub();
  const root = await tracked.test.pages.open({ path: '/' });

  await chooseGithub(await trackerPage(tracked.test));
  await root.draw();
  expect(root.findText(signInLabel)).toBeDefined();
  expect(
    tracked.github.requests.filter(({ host }) => host === 'api.github.com'),
  ).toEqual([]);
});

it('draws the sign-in again after GitHub rejects the token, and signing in again keeps the one Account', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));

  const root = await tracked.test.pages.open({ path: '/' });

  expect(root.findText('Open')).toBeDefined();

  // GitHub revokes the token; the page's next read after its freshness window is a 401.
  tracked.github.accepted.clear();
  await tracked.test.clock.advance(61_000);
  await root.draw();
  expect(root.findText(signInLabel)).toBeDefined();
  expect(root.findText('GitHub no longer accepts this sign-in.')).toBeDefined();

  tracked.github.accepted.add('token-1');
  await root.press(signInLabel);
  await until(tracked, root, 'Open');

  expect(tracked.test.accounts.list()).toHaveLength(1);
});

it('reads the overview in one call, and opens again inside the freshness window with none', async () => {
  const { test, github, root } = await signedInRoot();

  expect(root.findText('good first issue')).toBeDefined();
  expect(github.graphqlCalls()).toHaveLength(1);
  // Every call to the API but the sign-in's own `/user`: the overview is the only one, so no search or REST call follows it.
  expect(apiCalls(github)).toHaveLength(1);

  await test.clock.advance(30_000);
  await test.pages.open({ path: '/' });
  expect(apiCalls(github)).toHaveLength(1);
});
