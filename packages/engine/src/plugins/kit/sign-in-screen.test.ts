import type { SignInData } from '@repo/contracts/plugins/sign-in-api';
import { expect, it } from 'vitest';
import { valuesOf } from './render-tree';
import type { Pressed } from './sign-in-card';
import { signInScreen } from './sign-in-screen';

const run = (operation: string): Pressed => ({ operation, args: {} });

// Jira's mark, from Simple Icons 13.21.0 (CC0), in Atlassian's brand blue (atlassian.design/foundations/logos).
const logo =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#0052CC" d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/></svg>';

const draw = (
  data: Partial<SignInData> & Pick<SignInData, 'flow'>,
  options: { logo?: string } = {},
): ReturnType<typeof valuesOf> =>
  valuesOf(
    signInScreen({
      name: 'Jira',
      ...options,
      data: { rejected: null, needsServerDevice: false, ...data },
      start: run('signIn'),
      cancel: run('cancelSignIn'),
    }),
  );

// Every step of either flow, as the wire tree an App draws; the story reads this same file (ADR-0021).
const steps = {
  signedOut: draw({ flow: { kind: 'idle' } }),
  withLogo: draw({ flow: { kind: 'idle' } }, { logo }),
  refused: draw({
    flow: { kind: 'idle' },
    rejected: 'api.atlassian.com no longer accepts this sign-in.',
  }),
  requesting: draw({ flow: { kind: 'requesting' } }),
  waiting: draw({ flow: { kind: 'waiting' } }),
  code: draw({
    flow: {
      kind: 'code',
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://example.com/login/device',
      expiresAt: 0,
      lifetimeMs: 900_000,
    },
  }),
  signedIn: draw({
    flow: {
      kind: 'signed-in',
      label: 'ada@example.com',
      accountId: 'account-1',
    },
  }),
  ended: draw({
    flow: {
      kind: 'ended',
      end: 'expired',
      message: 'No approval came in time.',
    },
  }),
  serverDevice: draw({
    flow: { kind: 'idle' },
    needsServerDevice: true,
  }),
};

it('draws every sign-in step as the wire trees the story shows', async () => {
  await expect(JSON.stringify(steps, null, 2) + '\n').toMatchFileSnapshot(
    '../../../../../mocks/plugins/sign-in.json',
  );
});

it('copies the code, then opens the page that asks for it, from one press', () => {
  expect(JSON.stringify(steps.code)).toContain(
    '"onPress":{"action":"openUrl","url":"https://example.com/login/device","copy":"WDJB-MJHT"}',
  );
});

it('draws the service’s logo in the mark when the Plugin ships one, and leaves the mark to the App when not', () => {
  expect(JSON.stringify(steps.withLogo)).toContain('"slots":{"mark"');
  expect(JSON.stringify(steps.signedOut)).not.toContain('"mark"');
});

it('signs out in Settings, opening the Account there, since other Plugins may borrow it', () => {
  expect(JSON.stringify(steps.signedIn)).toContain(
    '"onPress":{"action":"openAccount","accountId":"account-1"}',
  );
});

it('gives a Device that cannot start nothing to press', () => {
  expect(JSON.stringify(steps.serverDevice)).not.toContain('"FieldGroup');
  expect(JSON.stringify(steps.ended)).toContain('"title":"Try again"');
});
