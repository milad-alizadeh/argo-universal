import type { z } from 'zod';
import { EditPauses, realClock, type PauseClock } from './edit-pauses';
import { showOptimistic, type TreePorts } from './optimistic-tree';
import type { PageRun, PageState } from './page-address';
import {
  madePageCall,
  type MadeOperationCall,
  type MadePageCall,
} from './page-call-payload';
import {
  PageCall,
  PageStateValue,
  componentEventHandler,
  componentEventRules,
  type WireJson,
} from './wire';
import { findWireNode } from './wire-node-key';

export type { PauseClock } from './edit-pauses';

// How long a bound search or selection waits for the edits to pause before the page draws for it.
const bindPauseMs = 300;

/*
 * The Component event a call came from: the node's key, the event's name and schema, whose metadata says
 * whether its edits are throttled or it flushes them, and its payload, which a binding puts into the Page
 * state.
 */
export type PageEvent = {
  key: string;
  name: string;
  schema: z.ZodType;
  payload?: WireJson;
};

// An Operation run as a tree's call makes it: for the Project and Session the tree was drawn for.
export type ScopedRun = Omit<PageRun, 'pluginId'>;

// What a tree with Page state draws again for: a Page state change, which an empty one draws from page one, and a load more.
export type PageStatePort = {
  change: (change: PageState) => Promise<void>;
  loadMore: () => Promise<void>;
};

/*
 * Everything one Plugin tree's calls reach, as the App or the test kit keeps it. `shown` is the tree shown now;
 * `patch` shows it patched at once and `unpatch` takes a patch of its own back off whatever is shown by then, so
 * a tree drawn in between is never replaced by an older one; `run` is the one call to the Server, which rejects
 * with why an Operation failed; `failed` says so, and a `failed` that throws rejects the call. A tree with no
 * Page state, as a Replaceable Slot's, has no `pageState`.
 */
export type PageCallsPorts = TreePorts & {
  scope: Pick<ScopedRun, 'projectId' | 'sessionId'>;
  run: (run: ScopedRun) => Promise<void>;
  failed: (error: Error) => void;
  pageState?: PageStatePort;
};

/*
 * What a Component event's call does on one Plugin tree, the same in the App and in a Plugin's tests (ADR-0050,
 * ADR-0031). An Operation runs for the tree's Project and Session: the nodes its call names show their optimistic
 * props at once, and a failure puts them back and says why. A load more, a Page state change and a bound value
 * draw the page again. A bound search or selection, and any call a throttled event makes, such as a TextField's
 * `onChangeText`, waits for the edits to pause, while the kit component shows them at once, so the page does not
 * draw on every keystroke. A press that flushes, such as a Button's or a Form's Submit, first lands every waiting
 * change, and then makes the call the newly drawn tree holds for it, so an Operation's arguments read the latest
 * Page state; a press whose node the new tree no longer has is refused, never made on another node.
 */
export class PageCalls {
  private readonly pauses: EditPauses;

  public constructor(
    private ports: PageCallsPorts,
    clock: PauseClock = realClock,
  ) {
    this.pauses = new EditPauses(clock);
  }

  // The tree's latest ports, as a new render of it holds them.
  public update(ports: PageCallsPorts): void {
    this.ports = ports;
  }

  public call(call: MadePageCall, event: PageEvent): Promise<void> {
    if ('bind' in call)
      return this.pause(call.bind, bindPauseMs, () =>
        this.changeBound(call.bind, event.payload),
      );

    return this.callUnbound(call, event);
  }

  // Every waiting change, made now, as a flushing press makes them.
  public async land(): Promise<void> {
    await this.pauses.land();
  }

  // The tree's waiting changes go with it.
  public close(): void {
    this.pauses.drop();
  }

  // A throttled event's call waits for its edits to pause; a flushing one lands every waiting change first.
  private callUnbound(call: MadePageCall, event: PageEvent): Promise<void> {
    const { throttleMs, flush } = componentEventRules(event.schema);

    if (throttleMs > 0)
      return this.pause(eventKey(event), throttleMs, () => this.makeCall(call));

    return flush ? this.flushCall(call, event) : this.makeCall(call);
  }

  private pause(
    key: string,
    ms: number,
    then: () => Promise<void>,
  ): Promise<void> {
    this.pauses.wait(key, ms, then);

    return Promise.resolve();
  }

  private async flushCall(call: MadePageCall, event: PageEvent): Promise<void> {
    if (!(await this.pauses.land())) return this.makeCall(call);

    return this.makeCall(this.callNow(event));
  }

  // The call the event's node makes in the tree drawn now.
  private callNow(event: PageEvent): MadePageCall {
    const call = PageCall.safeParse(this.handlerNow(event)).data;

    if (!call) throw new Error('That control is no longer on the page');

    return madePageCall(call, event.payload);
  }

  private handlerNow({ key, name, schema }: PageEvent): WireJson | undefined {
    const root = this.ports.shown();
    const node = root && findWireNode(root, key);

    return node && componentEventHandler(node.props, name, schema);
  }

  private changeBound(key: string, value: WireJson | undefined): Promise<void> {
    const parsed = PageStateValue.safeParse(value ?? '');

    return parsed.success
      ? this.makeCall({ pageState: { [key]: parsed.data } })
      : Promise.resolve();
  }

  private makeCall(call: MadePageCall): Promise<void> {
    if ('operation' in call) return this.run(call);

    return this.drawPage(call);
  }

  // A load more or a Page state change draws the page again; a bind has already landed as one.
  private async drawPage(
    call: Exclude<MadePageCall, MadeOperationCall>,
  ): Promise<void> {
    const { pageState } = this.ports;

    if (!pageState) throw new Error('This Plugin tree has no Page state');

    return drawPageFor(pageState, call);
  }

  private async run({
    operation,
    args,
    optimistic,
  }: MadeOperationCall): Promise<void> {
    const { scope, run, failed } = this.ports;
    const putBack = await showOptimistic(this.ports, optimistic);

    try {
      await run({ operation, args, ...definedScope(scope) });
    } catch (error) {
      putBack();
      failed(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

function drawPageFor(
  pageState: PageStatePort,
  call: Exclude<MadePageCall, MadeOperationCall>,
): Promise<void> {
  if ('pageState' in call) return pageState.change(call.pageState);

  return 'loadMore' in call ? pageState.loadMore() : Promise.resolve();
}

// A run names only the Project and Session the tree has.
const definedScope = ({
  projectId,
  sessionId,
}: PageCallsPorts['scope']): PageCallsPorts['scope'] => ({
  ...(projectId && { projectId }),
  ...(sessionId && { sessionId }),
});

// Each throttled event of each node waits on its own.
const eventKey = ({ key, name }: PageEvent): string =>
  JSON.stringify([key, name]);
