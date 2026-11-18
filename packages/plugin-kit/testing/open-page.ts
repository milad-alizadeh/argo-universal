import type { PageState } from '@repo/contracts/plugins/page-address';
import {
  PageCalls,
  type PageCallsPorts,
  type PageEvent,
  type ScopedRun,
} from '@repo/contracts/plugins/page-calls';
import {
  type Action,
  type PageCall,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { KeptTree } from './kept-tree';
import {
  findByText,
  findEntry,
  findNode,
  madeEventCall,
  handlerOf,
  paged,
  pageEventOf,
  type FoundNode,
  type NodeMatch,
} from './page-nodes';
import { caller, type Opened, type PageOpening } from './page-server';
import type { Showing } from './showing';

const rejected = (error: Error): never => {
  throw error;
};

/*
 * One Loader page as an App shows it (ADR-0050): its Page address, the tree the Server last drew there, and the
 * Component events an App acts on. A press does what the value in the tree says, with the event's payload filled
 * in, and through the same Page calls the App makes (`PageCalls`): a navigation opens the page it names, a Page
 * state change draws the new address, load more draws one more page, and an Operation runs for the page's Project
 * and Session, showing its optimistic props until it answers, and then the page draws again, as its stale mark
 * makes the App do. A bound value or a throttled edit waits for the edits to pause, on the test's clock; a press
 * that flushes lands it first.
 */
export class OpenPage {
  private readonly kept = new KeptTree();
  private state: PageState;
  private readonly calls: PageCalls;

  private constructor(
    private readonly showing: Showing,
    private readonly opening: Opened,
  ) {
    this.state = opening.pageState ?? {};
    this.calls = new PageCalls(this.ports(), showing.clock.wait);
  }

  // Opens the page and draws it once; a page that cannot draw rejects with why.
  static async open(showing: Showing, opening: PageOpening): Promise<OpenPage> {
    const page = new OpenPage(showing, { platform: 'web', ...opening });

    await page.drawn();
    page.requireDrawn();

    return page;
  }

  get path(): string {
    return this.opening.path;
  }

  get pageState(): PageState {
    return this.state;
  }

  // The tree the page shows, with an Operation's optimistic props while it runs; a draw that failed throws why.
  get tree(): WireNode {
    this.requireDrawn();

    const { shown } = this.kept;

    if (!shown) throw new Error(`${this.path} has drawn no tree`);

    return shown;
  }

  // Why the last draw failed, or undefined while it drew.
  get error(): string | undefined {
    return this.kept.error;
  }

  findText(text: string): FoundNode | undefined {
    return findByText(this.tree, text);
  }

  // The node `match` names; none throws.
  find(match: NodeMatch): WireNode {
    return findNode(this.tree, match);
  }

  /*
   * Draws the address again, as the App does when the page is marked stale. A draw is served the answer kept while
   * the read it is due runs behind it (ADR-0060), so once that read has landed, a page it marked draws again, as the
   * App does on that mark.
   */
  async draw(pages = this.kept.pages): Promise<void> {
    const { marks } = this.showing;
    const heard = marks.heard;

    await this.drawn(pages);
    await this.showing.settled();

    if (marks.reachedSince(heard, this.path)) await this.drawn(pages);
  }

  // One draw of the address, naming the tree kept; a pull says so.
  private async drawn(pages = this.kept.pages, pull = false): Promise<void> {
    const request = {
      path: this.path,
      pageState: this.state,
      ...caller(this.opening),
      pages,
      ...this.kept.known(),
      ...pullOf(pull),
    };

    this.kept.keep(await this.showing.server.draw(request, this.opening));
  }

  // `onPress` on the node `match` names; the page showing after it, a new one when it navigates.
  press(match: NodeMatch): Promise<OpenPage> {
    return this.act(match, 'onPress');
  }

  /*
   * The next page of the page's paged list, as a List's load more asks for it. After a draw that failed, the App
   * still shows the rows it kept, so the load more they offer asks again for the page the failed draw lacked.
   */
  async loadMore(): Promise<void> {
    if (this.kept.failedOfferingMore()) return this.drawn(this.kept.pages + 1);

    await this.act(paged, 'onLoadMore');
  }

  /*
   * The Component event `event` on the node `match` names, with the value a kit component reports, such as a
   * search's text for `onChangeText`. The event is the node's prop, or a prop of one of its prop objects, as a
   * List's `onLoadMore` sits in its `pagination`.
   */
  async act(
    match: NodeMatch,
    event: string,
    value?: WireJson,
  ): Promise<OpenPage> {
    const { node, key } = findEntry(this.tree, match);
    const handler = handlerOf(node, event);

    if (!handler) throw new Error(`${node.type} ${key} has no ${event}`);

    if ('action' in handler) return this.actOn(handler);

    await this.call(handler, pageEventOf(node, { key, name: event, value }));

    return this;
  }

  private call(handler: PageCall, event: PageEvent): Promise<void> {
    return this.calls.call(madeEventCall(this.tree, handler, event), event);
  }

  // A navigation opens the page it names for the same Project, Session and App; other Actions stay in the App.
  private async actOn(action: Action): Promise<OpenPage> {
    if (action.action !== 'navigate') return this;

    return OpenPage.open(this.showing, {
      ...this.opening,
      path: action.path,
      pageState: {},
    });
  }

  // The App's Page calls, on this page's tree; a failed Operation rejects the press with why.
  private ports(): PageCallsPorts {
    return {
      scope: caller(this.opening),
      shown: () => this.kept.shown,
      patch: (patch) => this.kept.patch(patch),
      unpatch: (patch) => this.kept.unpatch(patch),
      run: (run) => this.run(run),
      failed: rejected,
      pageState: {
        change: (change) => this.change(change),
        loadMore: () => this.drawn(this.kept.pages + 1),
      },
    };
  }

  private async run(run: ScopedRun): Promise<void> {
    await this.showing.server.run(run, this.opening);

    // The App draws again once the run's change window marks the page; by then the Queries it holds are read again.
    await this.showing.settled();
    await this.drawn();
  }

  // An empty change is a pull, which reads the first page again and keeps the pages loaded, as the App's does.
  private async change(change: PageState): Promise<void> {
    if (Object.keys(change).length === 0)
      return this.drawn(this.kept.pages, true);

    this.state = { ...this.state, ...change };
    this.kept.forget();

    await this.drawn(1);
  }

  private requireDrawn(): void {
    const { error } = this.kept;

    if (error !== undefined) throw new Error(error);
  }
}

const pullOf = (pull: boolean): { pull?: true } => (pull ? { pull: true } : {});
