import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import { replacementTreeReason } from '@repo/contracts/plugins/replacement-tree';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import type { RpcConnection } from '../../rpc';
import type { PluginRuntime } from '../runtime/plugin-runtime';
import { sanitizeTree } from '../visual/sanitize-tree';

type Replacement = { pluginId: string; path: string; input: ReplaceableInput };

type DrawingContext = Replacement & { runtime: PluginRuntime };

type RenderStream = {
  runtime: PluginRuntime;
  replacement: Replacement;
  connection: RpcConnection;
};

export async function* renderView({
  runtime,
  replacement,
  connection,
}: RenderStream): AsyncGenerator<ReplaceableMessage> {
  const drawing = new ReplacementDrawing({ ...replacement, runtime });

  const source = watchReplacement(runtime, replacement, connection);

  yield* drawnMessages(source, drawing);

  yield* drawing.finish(connection.signal);
}

async function* drawnMessages(
  source: AsyncIterable<ViewMessage>,
  drawing: ReplacementDrawing,
): AsyncGenerator<ReplaceableMessage> {
  for await (const message of source) {
    const next = drawing.receive(message);

    yield next;

    if (next.type === 'core') return;
  }
}

class ReplacementDrawing {
  private root: WireNode | null = null;
  private fellBack = false;

  public constructor(private readonly context: DrawingContext) {}

  public receive(message: ViewMessage): ReplaceableMessage {
    this.root = nextRoot(this.root, message);

    return this.root
      ? this.draw(this.root, message)
      : this.refuse('tree has no root');
  }

  private draw(root: WireNode, message: ViewMessage): ReplaceableMessage {
    const sanitized = sanitizeTree(root);
    const reason = visualRefusal(sanitized) ?? replacementTreeReason(root);

    return reason
      ? this.refuse(reason)
      : this.accept(prepareWireTree(sanitized.root), message);
  }

  private refuse(reason: string): ReplaceableMessage {
    const { runtime, pluginId, input } = this.context;
    this.fellBack = true;
    runtime.renderFallback(pluginId, input.slotId, reason);

    return { type: 'core', input };
  }

  public finish(signal: AbortSignal): ReplaceableMessage[] {
    if (signal.aborted || this.fellBack) return [];

    return [{ type: 'core', input: this.context.input }];
  }

  private accept(root: WireNode, message: ViewMessage): ReplaceableMessage {
    const { pluginId, path } = this.context;

    return {
      type: 'replacement',
      pluginId,
      path,
      message: { ...message, type: 'snapshot', root },
    };
  }
}

const visualRefusal = (
  sanitized: ReturnType<typeof sanitizeTree>,
): string | undefined => {
  const item = sanitized.refused[0];

  return item ? `${item.node}: ${item.reason}` : undefined;
};

function watchReplacement(
  runtime: PluginRuntime,
  replacement: Replacement,
  connection: RpcConnection,
): AsyncGenerator<ViewMessage> {
  return runtime.views.watch(
    replacement.pluginId,
    { path: replacement.path, renderSlot: replacement.input.slotId },
    connection,
  );
}
