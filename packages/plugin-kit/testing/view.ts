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
import { pollUntil, viewTimeoutMessage } from './view-timeout';

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

// A slow machine can lengthen this for one run, as ARGO_VIEW_LIMIT_MS=20000; nothing else changes it.
const defaultViewLimitMs = 3000;

const viewLimitMs =
  Number(process.env.ARGO_VIEW_LIMIT_MS) || defaultViewLimitMs;

type Event = ComponentEvent & { key: string };

// Observes production snapshots and patches; events use the same checked dispatch as an App.
export class PluginTestView {
  private readonly controller = new AbortController();
  private readonly connection;
  private root: WireNode | null = null;
  private readonly history: WireNode[] = [];
  private latest: ViewMessage | null = null;
  private failure: Error | null = null;
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
    void this.receive(opening).catch((error: Error) => {
      this.failure = error;
    });
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

  public async waitFor(ready: () => boolean, what?: string): Promise<void> {
    await pollUntil(ready, viewLimitMs, (waited) =>
      viewTimeoutMessage({
        ...waited,
        what,
        limitMs: viewLimitMs,
        trees: this.latest ? this.history.length : undefined,
      }),
    );
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
  }
}
