import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';
import { chooseView, flowOf } from './sign-in-view';

const account = { label: 'octocat', host: 'api.github.com' };

const idle = { kind: 'idle' } as const;

test('an Account from argo.accounts.get means signed in, on any device', () => {
  for (const serverDevice of [true, false])
    assert.deepEqual(chooseView({ account, serverDevice, flow: idle }), {
      kind: 'signed-in',
      account,
    });
});

test('without an Account, a device that is not the Server Device is told to continue there', () => {
  assert.deepEqual(
    chooseView({
      account: null,
      serverDevice: false,
      flow: { kind: 'waiting', attempt: Symbol('attempt') },
    }),
    {
      kind: 'continue-on-server-device',
    },
  );
});

test('on the Server Device the flow decides: signed out, waiting or a failure', () => {
  for (const flow of [
    idle,
    { kind: 'waiting', attempt: Symbol('attempt') },
    {
      kind: 'failed',
      title: 'Couldn’t start sign-in',
      message: 'Port 51789 is already in use.',
    },
  ] as const)
    assert.deepEqual(
      chooseView({ account: null, serverDevice: true, flow }),
      flow,
    );
});

test('a taken port and any other failure become a failed flow, a cancelled exchange goes back to idle', () => {
  const message = 'Port 51789 is already in use.';

  assert.equal(flowOf({ kind: 'port-in-use', message }).kind, 'failed');
  assert.equal(flowOf({ kind: 'failed', message }).kind, 'failed');
  assert.deepEqual(flowOf({ kind: 'cancelled' }), { kind: 'idle' });
});
