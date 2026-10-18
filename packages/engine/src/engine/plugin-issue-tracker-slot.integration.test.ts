import { fileURLToPath } from 'node:url';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
  type SlotMessage,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { PluginStorage } from '../plugins/storage';

const trackerPluginId = 'issue-tracker';

const githubTrackerId = 'github';

const githubButtonKey = '0/1/1';

const projectId = 'project-1';

const shippedPlugins = fileURLToPath(
  new URL('../../../../plugins', import.meta.url),
);

const slot: PluginSlotInput = {
  slotId: projectDetailsSlotId,
  context: { projectId },
};

type TrackerView = Extract<SlotMessage, { type: 'view' }>;

type ReadyTrackerView = { view: TrackerView; root: WireNode };

type EngineCaller = Awaited<ReturnType<typeof startEngineTestHost>>['caller'];

it('persists the tracker choice made in the real Project details Slot', async () => {
  const host = await startEngineTestHost({
    firstPartyPluginsDirectory: shippedPlugins,
    version: '0.0.0',
  });

  const controller = new AbortController();
  const caller = host.createCaller({ signal: controller.signal });
  const messages = (await caller.plugins.slot(slot))[Symbol.asyncIterator]();
  const initial = await nextTrackerMessage(messages);

  const ready = await waitForTrackerChoice(
    messages,
    initial,
    snapshotRoot(initial.message),
  );

  expect(findWireNode(ready.root, githubButtonKey)?.props).toMatchObject({
    label: 'GitHub Issues',
    disabled: false,
  });

  await dispatchTrackerChoice(caller, ready);

  expectSavedTracker(host.home);
  controller.abort();
}, 20_000);

async function nextTrackerMessage(
  messages: AsyncIterator<SlotMessage>,
): Promise<TrackerView> {
  const { value, done } = await messages.next();

  if (done) throw new Error('The Plugin Slot closed before its view arrived');

  if (isTrackerView(value)) return value;

  return nextTrackerMessage(messages);
}

function isTrackerView(
  message: SlotMessage,
): message is Extract<SlotMessage, { type: 'view' }> {
  return message.type === 'view' && message.pluginId === trackerPluginId;
}

async function waitForTrackerChoice(
  messages: AsyncIterator<SlotMessage>,
  view: TrackerView,
  root: WireNode,
): Promise<ReadyTrackerView> {
  if (findWireNode(root, githubButtonKey)?.props.disabled !== true)
    return { view, root };

  const next = await nextTrackerMessage(messages);

  return waitForTrackerChoice(messages, next, updateRoot(root, next.message));
}

async function dispatchTrackerChoice(
  caller: EngineCaller,
  ready: ReadyTrackerView,
): Promise<void> {
  const viewId = ready.view.message.viewId;

  if (!viewId) throw new Error('Expected the Plugin view identity');

  await caller.plugins.dispatch({
    pluginId: trackerPluginId,
    path: ready.view.path,
    revision: ready.view.message.revision,
    viewId,
    key: githubButtonKey,
    event: 'onPress',
  });
}

function snapshotRoot(message: ViewMessage): WireNode {
  if (message.type !== 'snapshot')
    throw new Error('Expected a Plugin view snapshot');

  return message.root;
}

function updateRoot(previous: WireNode, message: ViewMessage): WireNode {
  if (message.type === 'snapshot') return message.root;

  return applyPatch(previous, message.ops);
}

function expectSavedTracker(home: string): void {
  const storage = new PluginStorage(home);

  const [result] = storage.execute(trackerPluginId, [
    {
      sql: 'SELECT tracker_id FROM tracker_preferences WHERE project_id = ?',
      params: [projectId],
      method: 'get',
    },
  ]);

  try {
    expect(result?.rows[0]).toBe(githubTrackerId);
  } finally {
    storage.close();
  }
}
