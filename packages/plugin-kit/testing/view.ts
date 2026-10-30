import { type PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ComponentEvent,
  PluginSlotInput,
  SlotMessage,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import type { PluginService } from '@repo/engine/plugins';
import { testConnection } from './test-connection';
import { ViewChanges } from './view-changes';

// A test mount chooses the platform; the test App always speaks the current wire version.
type MountSurface = Pick<PluginSurface, 'platform'>;

export type Opening = {
  path: string;
  slot?: PluginSlotInput;
  surface?: MountSurface;
  projectId?: string;
  connectionId?: string;
};

export type PluginMount = {
  surface: MountSurface;
  pluginId?: string;
  projectId?: string;
  connectionId?: string;
} & ({ page: string } | { slot: PluginSlotInput });

type Event = ComponentEvent & { key: string };

// Observes production snapshots and patches; events use the same checked dispatch as an App.
export class PluginTestView {
  private readonly controller = new AbortController();
  private readonly connection;
  private root: WireNode | null = null;
  private readonly history: WireNode[] = [];
  private latest: ViewMessage | null = null;
  private failure: Error | null = null;
  private readonly changes = new ViewChanges();
  private path: string;
  private readonly projectId: string | undefined;

  public constructor(
    private readonly service: PluginService,
    private readonly pluginId: string,
    opening: Opening,
  ) {
    this.connection = testConnection(this.controller.signal, opening);
    this.path = opening.path;
    this.projectId = opening.projectId;
    this.watch(opening);
  }

  public get tree(): WireNode | null {
    if (this.failure) throw this.failure;

    return this.root;
  }

  public get message(): ViewMessage | null {
    return this.latest;
  }

  public get trees(): readonly WireNode[] {
    return this.history;
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
    await this.waitFor(
      () => this.findText(text) !== undefined,
      `a node reading ${JSON.stringify(text)}`,
    );
    const entry = this.findText(text);

    if (!entry) throw new Error(`Plugin node not found: ${text}`);

    return entry.node;
  }

  /*
   * Waits for what must happen, not for a time. A view that never comes is the test runner's timeout
   * to end, because only it knows how long this machine and this test are worth waiting.
   */
  public async waitFor(ready: () => boolean, what?: string): Promise<void> {
    await this.changes.until(ready, () => this.closure(what));
  }

  private watch(opening: Opening): void {
    void this.receive(opening)
      .catch((error: Error) => {
        this.failure = error;
      })
      .finally(() => this.changes.end());
  }

  // A stream that failed says why; one that merely ended says what it had rendered.
  private closure(what: string | undefined): Error {
    if (this.failure) return this.failure;

    const waiting = what ? ` (waiting for ${what})` : '';

    return new Error(
      `Plugin view closed before it reached the expected state${waiting}; ${this.arrived()}.`,
    );
  }

  private arrived(): string {
    return this.latest
      ? `the view had rendered ${this.history.length} tree(s)`
      : 'no view message had arrived';
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
      { pluginId: this.pluginId, path, projectId: this.projectId },
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
    this.root = nextRoot(this.root, message);

    if (this.root) this.history.push(this.root);
    this.latest = message;
    this.changes.announce();
  }
}
