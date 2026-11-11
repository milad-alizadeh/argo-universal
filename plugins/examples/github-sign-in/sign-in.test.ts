import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('draws the sign-in until the person signs in, on any device', (kit) =>
  kit.pages.open({ path: '/sign-in' }).then((page) => {
    assert.ok(page.findText('Sign in to GitHub'));
    assert.equal(page.findText('Continue on the Server Device'), undefined);
  }));
