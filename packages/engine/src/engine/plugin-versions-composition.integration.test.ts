import { legacyPartVersions } from '@repo/contracts/plugins/kit';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

interface Viewer {
  messages: ViewMessage[];
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

  return { messages };
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

it('adapts snapshots and patches independently for two Apps and a legacy Connection', async () => {
  const home = await createRuntimePlugins([
    { id: 'versions', fixture: 'wire-versions' },
  ]);

  const { url, caller } = await startEngineTestHost({ home });

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
  expect(legacy.messages[0]).toEqual(old.messages[0]);

  await caller.plugins.dispatch({
    pluginId: 'versions',
    path: '/',
    eventId: '0/tap:onPress',
  });
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
  expect(legacy.messages[1]).toEqual(patch);
}, 20_000);
