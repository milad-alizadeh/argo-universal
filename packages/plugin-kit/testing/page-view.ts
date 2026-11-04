import type { PageState } from '@repo/contracts/plugins/page-address';
import {
  madePageCall,
  type MadeOperationCall,
  type MadePageCall,
} from '@repo/contracts/plugins/page-call-payload';
import {
  treeAfter,
  type DrawAnswer,
  type HashedTree,
} from '@repo/contracts/plugins/page-draw';
import {
  PageStateValue,
  type Action,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import {
  findByText,
  findNode,
  handlerOf,
  pageHandler,
  type FoundNode,
  type NodeMatch,
} from './page-nodes';
import {
  caller,
  type Opened,
  type PageOpening,
  type PageServer,
} from './page-server';

// A node whose List loads more.
const paged = (node: WireNode): boolean =>
  handlerOf(node, 'onLoadMore') !== undefined;

// The Page state a change or a bound value sets.
const stateChange = (
  call: Exclude<MadePageCall, MadeOperationCall | { loadMore: true }>,
  value: WireJson | undefined,
): PageState =>
  'bind' in call
    ? { [call.bind]: PageStateValue.parse(value ?? '') }
    : call.pageState;

/*
 * One Loader page as an App shows it (ADR-0050): its Page address, the tree the Server last drew there, and the
 * Component events an App acts on. A press does what the value in the tree says, with the event's payload filled in,
 * as the App does: a navigation opens the page it names, a Page state change or a bound value draws the new address,
 * load more draws one more page, and an Operation runs for the page's Project and Session and, once it answers, the
 * page draws again, as its stale mark makes the App do. A bound value lands at once; the App waits for the edits to pause.
 */
export class PageView {
  private kept: HashedTree | undefined;
  private failure: string | undefined;
  private pages = 1;
  private state: PageState;

  private constructor(
    private readonly server: PageServer,
    private readonly opening: Opened,
  ) {
    this.state = opening.pageState ?? {};
  }

  // Opens the page and draws it once; a page that cannot draw rejects with why.
  static async open(
    server: PageServer,
    opening: PageOpening,
  ): Promise<PageView> {
    const view = new PageView(server, { platform: 'web', ...opening });

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

  findText(text: string): FoundNode | undefined {
    return findByText(this.tree, text);
  }

  // The node `match` names; none throws.
  find(match: NodeMatch): WireNode {
    return findNode(this.tree, match);
  }

  // Draws the address again, naming the tree kept, as the App does when the page is marked stale.
  async draw(pages = this.pages): Promise<void> {
    const request = {
      path: this.path,
      pageState: this.state,
      ...caller(this.opening),
      pages,
      ...(this.kept && { known: this.kept.hash }),
    };

    this.keep(await this.server.draw(request, this.opening));
  }

  // `onPress` on the node `match` names; the view showing after it, a new one when it navigates.
  press(match: NodeMatch): Promise<PageView> {
    return this.act(match, 'onPress');
  }

  // The next page of the page's paged list, as a List's load more asks for it.
  async loadMore(): Promise<void> {
    await this.act(paged, 'onLoadMore');
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
    const handler = pageHandler(this.tree, match, event);

    if ('action' in handler) return this.actOn(handler);

    await this.call(madePageCall(handler, value), value);

    return this;
  }

  // A navigation opens the page it names for the same Project, Session and App; other Actions stay in the App.
  private async actOn(action: Action): Promise<PageView> {
    if (action.action !== 'navigate') return this;

    return PageView.open(this.server, {
      ...this.opening,
      path: action.path,
      pageState: {},
    });
  }

  private call(call: MadePageCall, value?: WireJson): Promise<void> {
    if ('operation' in call) return this.run(call);

    if ('loadMore' in call) return this.draw(this.pages + 1);

    return this.change(stateChange(call, value));
  }

  // An empty change draws the same address again from its first page.
  private async change(change: PageState): Promise<void> {
    if (Object.keys(change).length > 0) {
      this.state = { ...this.state, ...change };
      this.kept = undefined;
    }

    await this.draw(1);
  }

  private async run({ operation, args }: MadeOperationCall): Promise<void> {
    const run = { operation, args, ...caller(this.opening) };

    await this.server.run(run, this.opening);
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
