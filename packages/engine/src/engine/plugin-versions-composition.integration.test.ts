import { legacyPartVersions } from '@repo/contracts/plugins/kit';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

interface Viewer {
  messages: ViewMessage[];
  client: TRPCClient<AppRouter>;
}

function viewer(url: string, parts?: Record<string, number>): Viewer {
  const socket = createWSClient({
    url: url.replace(/^http/, 'ws'),
    connectionParams: parts
      ? { pluginSurface: JSON.stringify({ platform: 'web', parts }) }
      : undefined,
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const messages: ViewMessage[] = [];

  const subscription = client.plugins.view.subscribe(
    { pluginId: 'versions', path: '/' },
    { onData: (message) => messages.push(message) },
  );

  onTestFinished(async () => {
    subscription.unsubscribe();
    await socket.close();
  });

  return { messages, client };
}

function snapshotOf(
  message: ViewMessage | undefined,
): Extract<ViewMessage, { type: 'snapshot' }> {
  if (message?.type !== 'snapshot') throw new Error('Expected a snapshot');

  return message;
}

function patchOf(
  message: ViewMessage | undefined,
): Extract<ViewMessage, { type: 'patch' }> {
  if (message?.type !== 'patch') throw new Error('Expected a patch');

  return message;
}

async function change(app: Viewer): Promise<void> {
  const snapshot = snapshotOf(app.messages[0]);

  if (!snapshot.viewId) throw new Error('Expected a view identity');

  await app.client.plugins.dispatch.mutate({
    pluginId: 'versions',
    path: '/',
    key: '0/tap',
    event: 'onPress',
    viewId: snapshot.viewId,
    revision: snapshot.revision,
  });
}

it('adapts snapshots and patches independently for two Apps and a legacy Connection', async () => {
  const home = await createRuntimePlugins([
    { id: 'versions', fixture: 'wire-versions' },
  ]);

  const { url } = await startEngineTestHost({ home });

  const old = viewer(url, legacyPartVersions);
  const current = viewer(url, { ...legacyPartVersions, Stack: 1, Text: 2 });
  const legacy = viewer(url);

  await expect
    .poll(
      () => [
        old.messages.length,
        current.messages.length,
        legacy.messages.length,
      ],
      { timeout: 10_000 },
    )
    .toEqual([1, 1, 1]);
  expect(old.messages[0]).toMatchObject({
    type: 'snapshot',
    root: {
      type: 'Column',
      props: {},
      children: [
        { props: { label: 'Before' } },
        {},
        { type: 'Text', props: { label: 'Update Argo to see this' } },
      ],
    },
  });
  expect(snapshotOf(old.messages[0]).root.children[0]?.props).toEqual({
    label: 'Before',
  });
  expect(current.messages[0]).toMatchObject({
    type: 'snapshot',
    root: {
      type: 'Stack',
      props: { direction: 'column' },
      children: [
        { props: { label: 'Before', accessibilityLabel: 'New optional prop' } },
        {},
        {},
      ],
    },
  });
  expect(snapshotOf(legacy.messages[0]).root).toEqual(
    snapshotOf(old.messages[0]).root,
  );

  for (const app of [old, current, legacy]) await change(app);

  await expect
    .poll(
      () => [
        old.messages.length,
        current.messages.length,
        legacy.messages.length,
      ],
      { timeout: 10_000 },
    )
    .toEqual([2, 2, 2]);
  const first = old.messages[0];
  const patch = old.messages[1];

  const snapshot = snapshotOf(first);
  const update = patchOf(patch);

  expect(applyPatch(snapshot.root, update.ops)).toMatchObject({
    type: 'Row',
    props: {},
    children: [{ props: { label: 'After' } }, {}, {}],
  });
  expect(current.messages[1]).toMatchObject({
    type: 'patch',
    ops: [
      { op: 'setProps', key: [], props: { direction: 'row' } },
      {
        op: 'setProps',
        key: ['label'],
        props: { label: 'After' },
      },
    ],
  });
  expect(
    applyPatch(
      snapshotOf(current.messages[0]).root,
      patchOf(current.messages[1]).ops,
    ).children[0]?.props,
  ).toEqual({ label: 'After', accessibilityLabel: 'New optional prop' });
  expect(patchOf(legacy.messages[1]).ops).toEqual(update.ops);
}, 20_000);
