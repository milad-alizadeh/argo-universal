import { expect, it } from 'vitest';
import {
  chooseGithub,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';
import { showsCode, signInLabel, until } from './sign-in-helpers';

const states = [
  {
    error: 'access_denied',
    more: {},
    title: 'Sign-in was denied',
    message: 'You turned the request down on GitHub.',
  },
  {
    error: 'expired_token',
    more: {},
    title: 'The code expired',
    message: 'GitHub codes run out. Ask for a new one.',
  },
  {
    error: 'incorrect_client_credentials',
    more: { error_description: 'The client_id is not valid.' },
    title: 'Couldn’t sign in',
    message: 'The client_id is not valid.',
  },
];

it.each(states)(
  'says so on the page when GitHub answers $error, and offers another try',
  async ({ error, more, title, message }) => {
    const tracked = await trackedGitHub();

    tracked.github.script({ error, ...more });

    const page = await showsCode(tracked);

    await until(tracked, page, title);
    expect(page.findText(message)).toBeDefined();
    expect(page.findText('Try again')).toBeDefined();
    expect(tracked.test.accounts.list()).toEqual([]);
  },
);

it('returns to the sign-in page when the person signs out, once the freshness window has passed', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));

  const root = await tracked.test.pages.open({ path: '/' });
  const [account] = tracked.test.accounts.list();

  expect(root.findText('Open')).toBeDefined();
  await tracked.test.accounts.signOut(account?.id ?? '');
  await tracked.test.clock.advance(61_000);
  await root.draw();

  expect(root.findText(signInLabel)).toBeDefined();
  expect(root.findText('Open')).toBeUndefined();
});
