import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';
import { chooseView } from './sign-in-view';

const account = { label: 'octocat', host: 'api.github.com' };

const idle = { kind: 'idle' } as const;

test('an Account from argo.accounts.get means signed in, on any device', () => {
  for (const serverDevice of [true, false])
    assert.deepEqual(chooseView({ account, serverDevice, flow: idle }), {
      kind: 'signed-in',
      account,
    });
});

test('the Account just added shows signed in before the Project has chosen it', () => {
  assert.deepEqual(
    chooseView({
      account: null,
      serverDevice: false,
      flow: { kind: 'signed-in', label: 'octocat' },
    }),
    { kind: 'signed-in', account },
  );
});

test('without an Account, a device that is not the Server Device is told to continue there', () => {
  assert.deepEqual(
    chooseView({
      account: null,
      serverDevice: false,
      flow: { kind: 'waiting' },
    }),
    { kind: 'continue-on-server-device' },
  );
});

test('the Server Device draws the sign-in where it stands', () => {
  const view = (flow: Parameters<typeof chooseView>[0]['flow']) =>
    chooseView({ account: null, serverDevice: true, flow });

  assert.deepEqual(view(idle), { kind: 'signed-out' });
  assert.deepEqual(view({ kind: 'waiting' }), { kind: 'waiting' });
  assert.deepEqual(
    view({
      kind: 'failed',
      reason: 'port-in-use',
      message: 'Port 51789 is in use',
    }),
    {
      kind: 'failed',
      title: 'Couldn’t start sign-in',
      message: 'Port 51789 is in use',
    },
  );
  assert.deepEqual(
    view({ kind: 'failed', reason: 'failed', message: 'GitHub said no' }),
    { kind: 'failed', title: 'Couldn’t sign in', message: 'GitHub said no' },
  );
});
