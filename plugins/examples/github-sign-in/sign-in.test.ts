import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('draws the sign-in until the person signs in, on any device', async (kit) => {
  const page = await kit.pages.open({ path: '/sign-in' });

  assert.deepEqual(
    [
      page.findText('Sign in to GitHub') !== undefined,
      page.findText('Continue on the Server Device'),
    ],
    [true, undefined],
  );
});
