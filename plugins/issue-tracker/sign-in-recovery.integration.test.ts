import type { PluginTestOptions } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  project,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';

type SecretStore = NonNullable<PluginTestOptions['secretStore']>;

// A delayed OS store, held until the test releases it; credentials stay in memory.
class DelayedSecrets implements SecretStore {
  private readonly values = new Map<string, string>();
  private hold = false;
  private readonly requested = Promise.withResolvers<void>();
  private readonly released = Promise.withResolvers<void>();

  delayReads(): void {
    this.hold = true;
  }

  waitForRead(): Promise<void> {
    return this.requested.promise;
  }

  resumeReads(): void {
    this.released.resolve();
  }

  async get(service: string, account: string): Promise<string | null> {
    if (this.hold) {
      this.requested.resolve();
      await this.released.promise;
    }

    return this.values.get(JSON.stringify([service, account])) ?? null;
  }

  set(service: string, account: string, value: string): Promise<void> {
    this.values.set(JSON.stringify([service, account]), value);

    return Promise.resolve();
  }

  delete(service: string, account: string): Promise<void> {
    this.values.delete(JSON.stringify([service, account]));

    return Promise.resolve();
  }
}

it('recovers from a slow credential read without asking the person to sign in again', async () => {
  const secretStore = new DelayedSecrets();
  const tracked = await trackedGitHub([project], { secretStore });
  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  secretStore.delayReads();
  const pending = tracked.test.pages.open({ path: '/' });
  await secretStore.waitForRead();
  await tracked.test.clock.advance(3000);
  secretStore.resumeReads();
  const root = await pending;

  expect(tracked.test.accounts.list()).toHaveLength(1);
  expect(root.findText('Sign in to GitHub')).toBeUndefined();
  expect(root.findText('good first issue')).toBeUndefined();
  expect(root.find(project.name).props.footer).toBe(
    'Account is temporarily unavailable. Try again.',
  );
  await tracked.test.clock.advance(61_000);
  await root.draw();
  expect(root.findText('good first issue')).toBeDefined();
  expect(root.find(project.name).props.footer).toBeUndefined();
  expect(root.findText('Sign in to GitHub')).toBeUndefined();
}, 30_000);
