import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  PageRun,
  PageRunAnswer,
  PageState,
} from '@repo/contracts/plugins/page-address';
import {
  treeAfter,
  type DrawAnswer,
  type DrawRequest,
  type HashedTree,
} from '@repo/contracts/plugins/page-draw';
import {
  Handler,
  PageStateValue,
  type PageCall,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';

type Platform = PluginSurface['platform'];

// Where a test opens a Loader page: its Page path, the Project and Session it opens for, its first Page state, and the App's platform.
export type PageOpening = {
  path: string;
  projectId?: string;
  sessionId?: string;
  pageState?: PageState;
  platform?: Platform;
};

// What a page view asks of the Server: a draw of its address, as the platform's App asks, and an Operation run.
export type PageServer = {
  draw: (
    request: Omit<DrawRequest, 'pluginId'>,
    platform: Platform,
  ) => Promise<DrawAnswer>;
  run: (run: Omit<PageRun, 'pluginId'>) => Promise<PageRunAnswer>;
};

type Found = NonNullable<ReturnType<typeof findWireNodeEntry>>;

// A node by the text it reads, or by a test of its own.
export type NodeMatch = string | ((node: WireNode) => boolean);

// The props `findText` reads a node's text from.
const textProps = ['label', 'title', 'text', 'children', 'accessibilityLabel'];

/*
 * One Loader page as an App shows it (ADR-0050): its Page address, the tree the Server last drew there, and the
 * Component events an App acts on. A press does what the value in the tree says, as the App does: a navigation opens
 * the page it names, a Page state change or a bound value draws the new address, load more draws one more page, and
 * an Operation runs for the page's Project and Session and, once it answers, the page draws again, as its stale mark
 * makes the App do. A bound value lands at once; the App waits for the edits to pause.
 */
export class PageView {
  private kept: HashedTree | undefined;
  private failure: string | undefined;
  private pages = 1;
  private state: PageState;

  private constructor(
    private readonly server: PageServer,
    private readonly opening: Required<Pick<PageOpening, 'path' | 'platform'>> &
      PageOpening,
  ) {
    this.state = opening.pageState ?? {};
  }

  // Opens the page and draws it once; a page that cannot draw rejects with why.
  static async open(
    server: PageServer,
    opening: PageOpening,
  ): Promise<PageView> {
    const view = new PageView(server, {
      ...opening,
      platform: opening.platform ?? 'web',
    });

    await view.draw();
    view.requireDrawn();

    return view;
  }

  get path(): string {
    return this.opening.path;
  }

  get pageState(): PageState {
    return this.state;
  }

  // The tree the page shows; a draw that failed throws why, as the App's toast says it.
  get tree(): WireNode {
    this.requireDrawn();

    if (!this.kept) throw new Error(`${this.path} has drawn no tree`);

    return this.kept.root;
  }

  // Why the last draw failed, or undefined while it drew.
  get error(): string | undefined {
    return this.failure;
  }

  findText(text: string): Found | undefined {
    return findWireNodeEntry(this.tree, (node) =>
      textProps.some((prop) => node.props[prop] === text),
    );
  }

  // The node `match` names; none throws.
  find(match: NodeMatch): WireNode {
    const entry =
      typeof match === 'string'
        ? this.findText(match)
        : findWireNodeEntry(this.tree, match);

    if (!entry) throw new Error(`No node matches ${describe(match)}`);

    return entry.node;
  }

  // Draws the address again, naming the tree kept, as the App does when the page is marked stale.
  async draw(pages = this.pages): Promise<void> {
    const { path, projectId, sessionId, platform } = this.opening;
    const answer = await this.server.draw(
      {
        path,
        pageState: this.state,
        ...(projectId && { projectId }),
        ...(sessionId && { sessionId }),
        pages,
        ...(this.kept && { known: this.kept.hash }),
      },
      platform,
    );

    this.keep(answer);
  }

  // `onPress` on the node `match` names; the view showing after it, a new one when it navigates.
  press(match: NodeMatch): Promise<PageView> {
    return this.act(match, 'onPress');
  }

  // The next page of the page's paged list, as a List's load more asks for it.
  async loadMore(): Promise<void> {
    await this.act((node) => handlerOf(node, 'onLoadMore') !== undefined, 'onLoadMore');
  }

  /*
   * The Component event `event` on the node `match` names, with the value a kit component reports, such as a
   * search's text for `onChangeText`. The event is the node's prop, or a prop of one of its prop objects, as a List's
   * `onLoadMore` sits in its `pagination`.
   */
  async act(
    match: NodeMatch,
    event: string,
    value?: WireJson,
  ): Promise<PageView> {
    const handler = handlerOf(this.find(match), event);
    const named = describe(match);

    if (!handler) throw new Error(`${named} has no ${event}`);

    if ('$event' in handler)
      throw new Error(`${named} sends ${event} to a mounted view`);

    if ('action' in handler) return this.actOn(handler);

    await this.call(handler, value);

    return this;
  }

  private async actOn(action: Extract<Handler, { action: string }>) {
    if (action.action !== 'navigate') return this;

    const { projectId, sessionId, platform } = this.opening;

    return PageView.open(this.server, {
      path: action.path,
      projectId,
      sessionId,
      platform,
    });
  }

  private async call(call: PageCall, value?: WireJson): Promise<void> {
    if ('operation' in call) return this.run(call);

    if ('loadMore' in call) return this.draw(this.pages + 1);

    if ('bind' in call)
      return this.change({ [call.bind]: PageStateValue.parse(value ?? '') });

    return this.change(call.pageState);
  }

  // An empty change draws the same address again from its first page.
  private async change(change: PageState): Promise<void> {
    if (Object.keys(change).length === 0) return this.draw(1);

    this.state = { ...this.state, ...change };
    this.kept = undefined;
    await this.draw(1);
  }

  private async run(call: Extract<PageCall, { operation: string }>) {
    const { projectId, sessionId } = this.opening;

    await this.server.run({
      operation: call.operation,
      args: call.args,
      ...(projectId && { projectId }),
      ...(sessionId && { sessionId }),
    });
    await this.draw();
  }

  private keep(answer: DrawAnswer): void {
    if (answer.kind === 'failed') {
      this.failure = answer.error;

      return;
    }

    this.failure = undefined;
    this.pages = Math.max(1, answer.pages);
    this.kept = treeAfter(this.kept, answer);
  }

  private requireDrawn(): void {
    if (this.failure !== undefined) throw new Error(this.failure);
  }
}

const describe = (match: NodeMatch): string =>
  typeof match === 'string' ? JSON.stringify(match) : 'the node test';

// The handler a node holds for `event`, on itself or in one of its prop objects.
function handlerOf(node: WireNode, event: string): Handler | undefined {
  const own = node.props[event];
  const within = Object.values(node.props).flatMap((prop) =>
    isRecord(prop) && event in prop ? [prop[event]] : [],
  );

  return Handler.safeParse(own ?? within[0]).data;
}

const isRecord = (value: WireJson): value is Record<string, WireJson> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
