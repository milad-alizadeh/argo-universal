import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  currentPartVersions,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type {
  PartEvent,
  PluginSlotInput,
  SlotMessage,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import type { PluginService } from '@repo/engine/plugins';

export type Opening = {
  path: string;
  slot?: PluginSlotInput;
  surface?: PluginSurface;
};

export type PluginMount = { surface: PluginSurface } & (
  | { page: string }
  | { slot: PluginSlotInput }
);

const viewLimitMs = 3000;

const currentSurface: PluginSurface = {
  platform: 'web',
  parts: currentPartVersions,
};

type Event = PartEvent & { key: string };

// Observes production snapshots and patches; events use the same checked dispatch as an App.
export class PluginTestView {
  private readonly controller = new AbortController();
  private readonly connection;
  private root: WireNode | null = null;
  private latest: ViewMessage | null = null;
  private failure: Error | null = null;
  private path: string;

  public constructor(
    private readonly service: PluginService,
    private readonly pluginId: string,
    opening: Opening,
  ) {
    this.connection = {
      id: randomUUID(),
      signal: this.controller.signal,
      // Without a mount surface, it reports every current part, as an up-to-date App does.
      surface: opening.surface ?? currentSurface,
    };
    this.path = opening.path;
    void this.receive(opening).catch((error: Error) => {
      this.failure = error;
    });
  }

  public get tree(): WireNode | null {
    if (this.failure) throw this.failure;

    return this.root;
  }

  public findText(text: string): ReturnType<typeof findWireNodeEntry> {
    if (!this.tree) return undefined;

    return findWireNodeEntry(this.tree, (node) =>
      ['label', 'title', 'text', 'children', 'accessibilityLabel'].some(
        (prop) => node.props[prop] === text,
      ),
    );
  }

  public async ready(): Promise<void> {
    await this.waitFor(() => this.tree !== null);
  }

  public async find(text: string): Promise<WireNode> {
    await this.waitFor(() => this.findText(text) !== undefined);
    const entry = this.findText(text);

    if (!entry) throw new Error(`Plugin node not found: ${text}`);

    return entry.node;
  }

  private async waitFor(ready: () => boolean): Promise<void> {
    const deadline = Date.now() + viewLimitMs;

    while (!ready()) {
      if (Date.now() >= deadline)
        throw new Error('Plugin view did not reach the expected state');
      await delay(1);
    }
  }

  public async dispatch(event: Event): Promise<void> {
    const latest = this.latest;

    if (!latest?.viewId) throw new Error('Plugin view is not ready');

    await this.service.dispatch(this.connection, {
      ...event,
      pluginId: this.pluginId,
      path: this.path,
      viewId: latest.viewId,
      revision: latest.revision,
    });
  }

  public async press(text: string): Promise<void> {
    const entry = this.findText(text);

    if (!entry) throw new Error(`Plugin control not found: ${text}`);
    await this.dispatch({ key: entry.key, event: 'onPress' });
  }

  public close(): void {
    this.controller.abort();
  }

  private receive({ path, slot }: Opening): Promise<void> {
    return slot ? this.receiveSlot(slot) : this.receivePage(path);
  }

  private async receivePage(path: string): Promise<void> {
    for await (const message of this.service.view(
      { pluginId: this.pluginId, path },
      this.connection,
    ))
      this.update(message);
  }

  private async receiveSlot(slot: PluginSlotInput): Promise<void> {
    for await (const message of this.service.slot(slot, this.connection)) {
      if (!this.contributes(message)) continue;
      this.path = message.path;
      this.update(message.message);
    }
  }

  private contributes(
    message: SlotMessage,
  ): message is Extract<SlotMessage, { type: 'view' }> {
    return message.type === 'view' && message.pluginId === this.pluginId;
  }

  private update(message: ViewMessage): void {
    if (message.type === 'snapshot') this.root = message.root;
    else if (this.root) this.root = applyPatch(this.root, message.ops);
    this.latest = message;
  }
}
