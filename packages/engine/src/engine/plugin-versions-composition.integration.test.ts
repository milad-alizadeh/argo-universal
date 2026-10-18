import { legacyPartVersions } from '@repo/contracts/plugins/kit';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
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

async function waitForMessages(apps: Viewer[], count: number): Promise<void> {
  await expect
    .poll(() => apps.map((app) => app.messages.length), { timeout: 10_000 })
    .toEqual(apps.map(() => count));
}

function firstProps(app: Viewer): WireNode['props'] | undefined {
  return snapshotOf(app.messages[0]).root.children[0]?.props;
}

const accessibilityLabel = 'New optional prop';

it('adapts snapshots and patches independently for three App versions and a legacy Connection', async () => {
  const home = await createRuntimePlugins([
    { id: 'versions', fixture: 'wire-versions' },
  ]);

  const { url } = await startEngineTestHost({ home });

  const old = viewer(url, legacyPartVersions);
  const previous = viewer(url, { ...legacyPartVersions, Stack: 1, Text: 2 });
  const current = viewer(url, { ...legacyPartVersions, Stack: 1, Text: 3 });
  const legacy = viewer(url);
  const apps = [old, previous, current, legacy];

  await waitForMessages(apps, 1);
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
  expect(firstProps(old)).toEqual({
    label: 'Before',
  });
  expect(firstProps(previous)).toEqual({
    label: 'Before',
    accessibilityLabel: accessibilityLabel,
  });
  expect(current.messages[0]).toMatchObject({
    type: 'snapshot',
    root: {
      type: 'Stack',
      props: { direction: 'column' },
      children: [
        {
          props: {
            children: 'Before',
            accessibilityLabel: accessibilityLabel,
          },
        },
        {},
        {},
      ],
    },
  });
  expect(snapshotOf(legacy.messages[0]).root).toEqual(
    snapshotOf(old.messages[0]).root,
  );

  await Promise.all(apps.map(change));

  await waitForMessages(apps, 2);
  const snapshot = snapshotOf(old.messages[0]);
  const update = patchOf(old.messages[1]);

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
        props: { children: 'After' },
      },
    ],
  });
  expect(
    applyPatch(
      snapshotOf(current.messages[0]).root,
      patchOf(current.messages[1]).ops,
    ).children[0]?.props,
  ).toEqual({ children: 'After', accessibilityLabel: accessibilityLabel });
  expect(patchOf(legacy.messages[1]).ops).toEqual(update.ops);
}, 20_000);
