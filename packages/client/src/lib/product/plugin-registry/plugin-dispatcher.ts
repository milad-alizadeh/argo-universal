import {
  componentEventPayload,
  componentEventRules,
  type ComponentEvent,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';

export type PluginOnEvent = (
  key: string,
  event: ComponentEvent,
) => void | Promise<void>;

// A Component event before the App checks its payload against the kit component's event schema.
export type ComponentEventInput = {
  event: string;
  payload?: WireJson;
  schema: z.ZodType;
};

type Queued = {
  key: string;
  event: ComponentEvent;
  deliver: PluginOnEvent;
  timer: ReturnType<typeof setTimeout>;
  reply: PromiseWithResolvers<void>;
};

// A rejected delivery, as the Plugin's Server answered it.
type DeliveryFailure = Error;

export type ReportFailure = (failure: DeliveryFailure) => void;

const ignoreFailure: ReportFailure = (): void => {};

// The one place a tree's Component events are coalesced: a throttled edit waits, and only its latest value is sent.
export class PluginDispatcher {
  private readonly queued = new Map<string, Queued>();
  // Throttled edits on their way to the Plugin; they settle, never reject.
  private readonly edits = new Set<Promise<void>>();
  constructor(
    private deliver: PluginOnEvent,
    private readonly report: ReportFailure = ignoreFailure,
  ) {}

  public setDelivery(deliver: PluginOnEvent): void {
    this.deliver = deliver;
  }

  public send(key: string, input: ComponentEventInput): void | Promise<void> {
    const event = checkedComponentEvent(input);
    const { awaits, flush, throttleMs } = componentEventRules(input.schema);
    const deliver = this.deliveryFor(awaits);

    if (throttleMs) return this.queue({ key, event, deliver }, throttleMs);
    // Queued edits reach the Plugin, in order, before a Submit or press that flushes.
    const edits = flush ? this.releaseAll() : [];

    return after(edits, () => deliver(key, event));
  }

  // Closing sends what the user typed rather than dropping it.
  public close(): void {
    void this.releaseAll();
  }

  // An awaited event's kit component reports its own failure; any other is reported here.
  private deliveryFor(awaits?: boolean): PluginOnEvent {
    return awaits ? this.deliver : reporting(this.deliver, this.report);
  }

  private queue(
    edit: Omit<Queued, 'timer' | 'reply'>,
    delay: number,
  ): Promise<void> {
    const id = JSON.stringify([edit.key, edit.event.event]);

    const queued = this.queued.get(id) ?? {
      ...edit,
      timer: setTimeout(() => this.release(id), delay),
      reply: Promise.withResolvers<void>(),
    };

    this.queued.set(id, Object.assign(queued, edit));

    return queued.reply.promise;
  }

  private release(id: string): void {
    const queued = this.queued.get(id);

    if (!queued) return;
    clearTimeout(queued.timer);
    this.queued.delete(id);
    const delivery = deliverQueued(queued);
    this.edits.add(delivery);
    void delivery.then(() => this.edits.delete(delivery));
  }

  private releaseAll(): Promise<void>[] {
    for (const id of this.queued.keys()) this.release(id);

    return [...this.edits];
  }
}

// A payload that fails the check is not sent; the field it came from rolls back.
function checkedComponentEvent(input: ComponentEventInput): ComponentEvent {
  const { event, schema } = input;

  try {
    return { event, payload: componentEventPayload(schema, sent(input)) };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(event, error);
    throw error;
  }
}

// A press reports a native event object; its Component event carries no payload.
const sent = ({
  schema,
  payload,
}: ComponentEventInput): WireJson | undefined =>
  schema instanceof z.ZodUndefined ? undefined : payload;

// A failed delivery is reported once, as it fails; the caller still sees the rejection.
function reporting(
  deliver: PluginOnEvent,
  report: ReportFailure,
): PluginOnEvent {
  return (key, event) => {
    const delivery = deliver(key, event);
    void delivery?.catch(report);

    return delivery;
  };
}

function after(
  edits: Promise<void>[],
  deliver: () => void | Promise<void>,
): void | Promise<void> {
  return edits.length ? Promise.all(edits).then(deliver) : deliver();
}

async function deliverQueued(queued: Queued): Promise<void> {
  try {
    await queued.deliver(queued.key, queued.event);
    queued.reply.resolve();
  } catch (error) {
    queued.reply.reject(error);
  }
}
