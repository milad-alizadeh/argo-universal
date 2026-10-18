import { fileURLToPath } from 'node:url';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
  type SlotMessage,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const trackerPluginId = 'issue-tracker';

const projectId = 'project-1';

const selectTracker = 'Select GitHub Issues';

const selectedTracker = 'Selected GitHub Issues';

const shippedPlugins = fileURLToPath(
  new URL('../../../../plugins', import.meta.url),
);

const slot: PluginSlotInput = {
  slotId: projectDetailsSlotId,
  context: { projectId },
};

type TrackerView = Extract<SlotMessage, { type: 'view' }>;

type ReadyTrackerView = { view: TrackerView; root: WireNode };

it('persists the Tracker choice through the Project details Slot', async () => {
  const host = await startEngineTestHost({
    firstPartyPluginsDirectory: shippedPlugins,
    version: '0.0.0',
  });

  const trackerSelected = await selectTrackerInSlot(host);

  expect(trackerSelected && (await reopenedTrackerIsSelected(host))).toBe(true);
}, 20_000);

async function selectTrackerInSlot(
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): Promise<boolean> {
  const firstController = new AbortController();
  const firstCaller = host.createCaller({ signal: firstController.signal });

  const firstMessages = (await firstCaller.plugins.slot(slot))[
    Symbol.asyncIterator
  ]();

  const firstView = await nextTrackerMessage(firstMessages);

  const ready = await waitForButton({
    messages: firstMessages,
    view: firstView,
    root: snapshotRoot(firstView.message),
    label: selectTracker,
  });

  const enabled =
    findButton(ready.root, selectTracker)?.node.props.disabled === false;

  await dispatchButton(firstCaller, ready, selectTracker);
  await waitForButton({
    messages: firstMessages,
    view: ready.view,
    root: ready.root,
    label: selectedTracker,
  });
  firstController.abort();

  return enabled;
}

async function reopenedTrackerIsSelected(
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): Promise<boolean> {
  const secondController = new AbortController();

  const secondMessages = (
    await host
      .createCaller({ signal: secondController.signal })
      .plugins.slot(slot)
  )[Symbol.asyncIterator]();

  const reopened = await nextTrackerMessage(secondMessages);

  const persisted = await waitForButton({
    messages: secondMessages,
    view: reopened,
    root: snapshotRoot(reopened.message),
    label: selectedTracker,
  });

  const selected = findButton(persisted.root, selectedTracker);

  secondController.abort();

  return selected?.node.props.disabled === false;
}

async function nextTrackerMessage(
  messages: AsyncIterator<SlotMessage>,
): Promise<TrackerView> {
  const { value, done } = await messages.next();

  if (done) throw new Error('The Plugin Slot closed before its view arrived');

  return hasTrackerView(value) ? value : nextTrackerMessage(messages);
}

function hasTrackerView(message: SlotMessage): message is TrackerView {
  return message.type === 'view' && message.pluginId === trackerPluginId;
}

async function waitForButton({
  messages,
  view,
  root,
  label,
}: {
  messages: AsyncIterator<SlotMessage>;
  view: TrackerView;
  root: WireNode;
  label: string;
}): Promise<ReadyTrackerView> {
  const button = findButton(root, label);

  if (button && button.node.props.disabled !== true) return { view, root };

  const next = await nextTrackerMessage(messages);

  return waitForButton({
    messages,
    view: next,
    root: updateRoot(root, next.message),
    label,
  });
}

async function dispatchButton(
  caller: Awaited<ReturnType<typeof startEngineTestHost>>['caller'],
  ready: ReadyTrackerView,
  label: string,
): Promise<void> {
  const button = findButton(ready.root, label);
  const viewId = ready.view.message.viewId;

  if (!button) throw new Error(`Could not find the ${label} control`);

  if (!viewId) throw new Error('Expected the Plugin view identity');

  await caller.plugins.dispatch({
    pluginId: trackerPluginId,
    path: ready.view.path,
    revision: ready.view.message.revision,
    viewId,
    key: button.key,
    event: 'onPress',
  });
}

function findButton(
  root: WireNode,
  label: string,
): { node: WireNode; key: string } | undefined {
  const entry = findWireNodeEntry(
    root,
    (node) => node.type === 'Button' && node.props.label === label,
  );

  return entry ? { node: entry.node, key: entry.key } : undefined;
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
