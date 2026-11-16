import type { WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { person } from './mocks/jira-data';
import {
  ada,
  choose,
  fillSignIn,
  projectPage,
  signIn,
  startJira,
  tokenError,
} from './mocks/journey';
import { notices } from './sign-in-notices';

const timeoutMs = 20_000;

const newToken = 'ATATT-scoped-new-91c0';

const signInState = (node: WireNode): boolean =>
  node.type === 'EmptyState' && node.props.title === 'Sign in to Jira';

const hasTokenField = (node: WireNode): boolean =>
  node.type === 'FieldGroup.SecretField';

it(
  'after Jira refuses the token, Sign in takes a new one and the issues come back',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    await choose(page, 'Jira project', 'ARGO');

    // Revoked at Atlassian: the page notices on its next read, within a minute, and draws the signed-out page.
    jira.jira.data.tokens.splice(0, jira.jira.data.tokens.length, {
      ...person,
      token: newToken,
      scoped: true,
    });
    await jira.test.clock.advance(60_000);
    await page.draw();

    expect(page.find(signInState).props.description).toBe(
      'Jira no longer accepts this sign-in.',
    );

    // The sign-in page takes a token again, though the kit's paste last said "signed in".
    const signInPage = await page.press('Sign in');

    expect(signInPage.find(hasTokenField)).toBeDefined();
    expect(tokenError(signInPage)).toBe('Jira no longer accepts this sign-in.');

    await fillSignIn(jira, { ...ada, token: newToken }, signInPage);

    expect(signInPage.findText(`Signed in as ${person.email}`)).toBeDefined();
    expect(
      (await projectPage(jira)).findText('Show Jira issues in Argo'),
    ).toBeDefined();
  },
  timeoutMs,
);

it(
  'after the Account is signed out in Settings, Sign in takes a new token',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const [account] = jira.test.accounts.list();

    await jira.test.accounts.signOut(account?.id ?? '');

    const page = await projectPage(jira);
    const signInPage = await page.press('Sign in');

    expect(signInPage.find(hasTokenField)).toBeDefined();
    expect(tokenError(signInPage)).toBe(notices.gone);
  },
  timeoutMs,
);
