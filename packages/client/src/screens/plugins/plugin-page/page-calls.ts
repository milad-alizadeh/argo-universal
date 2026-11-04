import type {
  MadeOperationCall,
  MadePageCall,
} from '@repo/contracts/plugins/page-call-payload';
import {
  PageStateValue,
  componentEventRules,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import type { PageEvent } from '../../../lib/product/plugin-registry';
import { EditPauses } from './edit-pauses';
import type { PageAddresses, PageOpening } from './page-addresses';

// How long a bound search or selection waits for the edits to pause before the page draws for it.
const bindPauseMs = 300;

export type PageCallsDeps = {
  addresses: PageAddresses;
  opening: PageOpening;
  run: (call: MadeOperationCall) => Promise<void>;
};

/*
 * One Loader page's calls (ADR-0050, ADR-0031). An Operation runs; a load more, a Page state change and a
 * bound value draw the page again. A bound search or selection, and any call a throttled event makes, such
 * as a TextField's `onChangeText`, waits for the edits to pause, while the kit component shows them at once,
 * so the page does not draw on every keystroke.
 */
export class PageCalls {
  private readonly pauses = new EditPauses();

  public constructor(private deps: PageCallsDeps) {}

  // The page's latest Operation run, as the App's mutation makes it.
  public update(deps: PageCallsDeps): void {
    this.deps = deps;
  }

  public call(call: MadePageCall, event: PageEvent): Promise<void> {
    const { throttleMs } = componentEventRules(event.schema);

    if ('bind' in call)
      return this.later(call.bind, bindPauseMs, () =>
        this.bound(call.bind, event.payload),
      );

    if (throttleMs > 0)
      return this.later(eventKey(event), throttleMs, () => this.made(call));

    return this.made(call);
  }

  // The page's waiting changes go with it.
  public close(): void {
    this.pauses.drop();
  }

  private later(
    key: string,
    ms: number,
    then: () => Promise<void>,
  ): Promise<void> {
    this.pauses.wait(key, ms, then);

    return Promise.resolve();
  }

  private bound(key: string, value: WireJson | undefined): Promise<void> {
    const parsed = PageStateValue.safeParse(value ?? '');

    return parsed.success
      ? this.made({ pageState: { [key]: parsed.data } })
      : Promise.resolve();
  }

  private made(call: MadePageCall): Promise<void> {
    const { addresses, opening, run } = this.deps;

    if ('operation' in call) return run(call);

    if ('loadMore' in call) return addresses.loadMore(opening);

    if ('bind' in call) return Promise.resolve();

    return addresses.change(opening, call.pageState);
  }
}

// Each throttled event of each node waits on its own.
const eventKey = ({ key, name }: PageEvent): string =>
  JSON.stringify([key, name]);
