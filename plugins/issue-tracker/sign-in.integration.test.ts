import { expect, it } from 'vitest';
import {
  clockUntil,
  signedIn,
  tracker,
  wait,
  type PageView,
  type Tracked,
} from './journey-fixture';

const surface = { platform: 'web' } as const;

const signInLabel = 'Sign in to GitHub';

const signedInText = 'Signed in as octocat';

const signInPage = ({ test }: Tracked): Promise<PageView> =>
  test.mount({ page: '/sign-in', surface });

const shown = (view: PageView): string => JSON.stringify(view.trees.at(-1));

async function showsCode(tracked: Tracked): Promise<PageView> {
  const page = await signInPage(tracked);

  await page.press(signInLabel);
  await expect.poll(() => shown(page), wait).toContain('WDJB-MJHT');

  return page;
}

it('asks for a code, shows it with where to enter it, and names the Account once approved', async () => {
  const tracked = await tracker();
  const page = await showsCode(tracked);

  expect(shown(page)).toContain('https://github.com/login/device');
  await clockUntil(tracked.test, page, signedInText);
  expect(tracked.github.requests.map(({ path }) => path)).toContain(
    '/login/oauth/access_token',
  );
}, 30_000);

it('keeps waiting through pending and slow_down answers, then signs in', async () => {
  const tracked = await tracker();

  tracked.github.script(
    { error: 'authorization_pending' },
    { error: 'slow_down' },
    { access_token: 'token-1' },
  );

  const page = await showsCode(tracked);

  await clockUntil(tracked.test, page, signedInText);

  const polls = tracked.github.requests.filter(
    ({ path }) => path === '/login/oauth/access_token',
  );

  expect(polls).toHaveLength(3);
  expect(polls[0]?.body).toContain(
    'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code',
  );
}, 30_000);

it('says the request was denied, and offers another try that can succeed', async () => {
  const tracked = await tracker();

  tracked.github.script({ error: 'access_denied' });

  const page = await showsCode(tracked);

  await clockUntil(tracked.test, page, 'Sign-in was denied');
  expect(shown(page)).toContain('Try again');
  tracked.github.script({ access_token: 'token-1' });
  await page.press('Try again');
  await clockUntil(tracked.test, page, signedInText);
}, 30_000);

it('says the code expired', async () => {
  const tracked = await tracker();

  tracked.github.script({ error: 'expired_token' });

  const page = await showsCode(tracked);

  await clockUntil(tracked.test, page, 'The code expired');
  expect(shown(page)).toContain('Try again');
}, 30_000);

it('says why GitHub refused the sign-in', async () => {
  const tracked = await tracker();

  tracked.github.script({
    error: 'incorrect_client_credentials',
    error_description: 'The client_id is not valid.',
  });

  const page = await showsCode(tracked);

  await clockUntil(tracked.test, page, 'The client_id is not valid.');
  expect(page.findText('Couldn’t sign in')).toBeDefined();
}, 30_000);

it('lets the person give up waiting', async () => {
  const tracked = await tracker();
  const page = await showsCode(tracked);

  await page.press('Cancel');
  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  expect(shown(page)).not.toContain('WDJB-MJHT');
}, 30_000);

it('draws the same sign-in for a device that is not the Server Device', async () => {
  // The kit harness connects as a paired Device would: no Server Device flag is set on its connection.
  const tracked = await tracker();
  const page = await signInPage(tracked);

  expect(shown(page)).not.toContain('Server Device');
  await page.press(signInLabel);
  await clockUntil(tracked.test, page, signedInText);
}, 30_000);

it('draws the sign-in in place of the Issues page when there is no Account', async () => {
  const tracked = await tracker();
  const root = await tracked.test.mount({ page: '/', surface });

  await expect.poll(() => root.findText(signInLabel), wait).toBeDefined();
  expect(tracked.github.graphqlCalls()).toHaveLength(0);
  expect(tracked.github.requests).toHaveLength(0);
}, 30_000);

it('draws the sign-in again after the token is rejected, and signing in as the same person reuses that Account', async () => {
  const { test, github } = await signedIn();
  const root = await test.mount({ page: '/', surface });

  await expect.poll(() => root.findText('Open'), wait).toBeDefined();

  // GitHub revokes the token; the next read after the freshness window is a 401.
  github.accepted.clear();
  await clockUntil(test, root, signInLabel);
  expect(shown(root)).toContain('no longer accepts');

  github.accepted.add('token-2');
  github.script({ access_token: 'token-2' });
  await root.press(signInLabel);
  await clockUntil(test, root, 'Open');
  expect(root.findText(signInLabel)).toBeUndefined();
}, 40_000);
