import type { PatchOp } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { liveAnswers, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const editsFixture = { id: 'edits', fixture: 'wire-edits' };

// The ops of the patch a live page sends when its Loader yields its second value.
async function patchOps(path: string): Promise<PatchOp[]> {
  const home = await createRuntimePlugins([editsFixture]);
  const host = await startEngineTestHost({ home });
  const [, patch] = await liveAnswers(host, pageAt('edits', path), 2);

  if (patch?.kind !== 'patch') throw new Error('Expected a patch');

  return patch.ops;
}

it('publishes changed and removed properties', async () => {
  await expect(patchOps('/props')).resolves.toEqual([
    {
      op: 'setProps',
      key: ['kept'],
      props: { children: 'Changed' },
      unset: ['tone'],
    },
  ]);
}, 10_000);

it('replaces a node whose type changed', async () => {
  await expect(patchOps('/replace')).resolves.toEqual([
    {
      op: 'replace',
      key: ['kept'],
      node: {
        type: 'Button',
        key: 'kept',
        props: { label: 'Changed' },
        children: [],
        slots: {},
      },
    },
  ]);
}, 10_000);

it('removes a keyed row', async () => {
  await expect(patchOps('/remove')).resolves.toEqual([
    { op: 'remove', key: ['removed'] },
  ]);
}, 10_000);
