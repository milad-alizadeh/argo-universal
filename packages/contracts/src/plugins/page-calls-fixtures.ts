import type { PauseClock } from './edit-pauses';
import { kitComponent } from './kit';
import type { TreePatch } from './optimistic-tree';
import type { PageState } from './page-address';
import {
  PageCalls,
  type PageCallsPorts,
  type PageEvent,
  type ScopedRun,
} from './page-calls';
import type { WireNode } from './wire';
import { childNodeKey } from './wire-node-key';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const creating = [{ key: 'create', props: { label: 'Creating' } }];

/*
 * A draft field whose typing is Page state, and a Create button whose Operation takes the draft the page
 * drew and shows the button as creating while it runs; with the draft `gone` the button is not drawn.
 */
const createButton = (draft: string): WireNode =>
  node('Button', 'create', {
    label: 'Create',
    onPress: {
      operation: 'create',
      args: { title: draft },
      optimistic: creating,
    },
  });

function draftPage(pageState: PageState): WireNode {
  const draft = String(pageState.draft ?? '');

  const field = node('FieldGroup.TextField', 'draft', {
    label: 'Title',
    value: draft,
    onChangeText: { pageState: { draft: { $payload: true } } },
  });

  return {
    ...node('Stack', 'page', {}),
    children: [field, ...(draft === 'gone' ? [] : [createButton(draft)])],
  };
}

const keyOf = (key: string): string =>
  childNodeKey(childNodeKey('', 'page'), key);

export function schemaOf(type: string, name: string): PageEvent['schema'] {
  const schema = kitComponent(type)?.events[name];

  if (!schema) throw new Error(`${type} has no ${name}`);

  return schema;
}

type Timer = { at: number; fire: () => Promise<void> };

// A clock that moves only when the test advances it.
class TestClock {
  private now = 0;
  private readonly timers = new Set<Timer>();

  readonly wait: PauseClock = (ms, fire) => {
    const timer = { at: this.now + ms, fire };

    this.timers.add(timer);

    return () => this.timers.delete(timer);
  };

  async advance(ms: number): Promise<void> {
    this.now += ms;
    const due = [...this.timers].filter(({ at }) => at <= this.now);

    for (const timer of due) this.timers.delete(timer);

    await Promise.all(due.map(({ fire }) => fire()));
  }
}

// A promise the test settles: `settle()` resolves it, `settle(error)` rejects it with that error.
class Gate {
  private readonly settled = Promise.withResolvers<void>();
  readonly promise = this.settled.promise;

  readonly settle = (error?: string): void => {
    if (error) this.settled.reject(new Error(error));
    else this.settled.resolve();
  };
}

/*
 * One Loader page in memory, drawn at its Page state, for a Project and Session, whose calls go through
 * `PageCalls` on a test clock. `pageState: false` makes it a tree with no Page state, as a Replaceable Slot's.
 */
export class DraftPage {
  readonly clock = new TestClock();
  readonly drafts: unknown[] = [];
  readonly runs: ScopedRun[] = [];
  readonly failures: string[] = [];
  readonly calls: PageCalls;
  private state: PageState = {};
  private patched: WireNode | undefined;
  private draws: Gate | undefined;
  private running: Gate | undefined;
  private drawError: string | undefined;

  constructor(withState = true) {
    this.calls = new PageCalls(this.ports(withState), this.clock.wait);
  }

  shown(): WireNode {
    return this.patched ?? draftPage(this.state);
  }

  type(text: string): Promise<void> {
    return this.calls.call(
      { pageState: { draft: text } },
      {
        key: keyOf('draft'),
        name: 'onChangeText',
        schema: schemaOf('FieldGroup.TextField', 'onChangeText'),
        payload: text,
      },
    );
  }

  press(): Promise<void> {
    return this.calls.call(
      { operation: 'create', args: { title: '' }, optimistic: creating },
      {
        key: keyOf('create'),
        name: 'onPress',
        schema: schemaOf('Button', 'onPress'),
      },
    );
  }

  // Page state draws wait until the answer lets them land.
  hold(): () => void {
    const gate = new Gate();

    this.draws = gate;

    return () => gate.settle();
  }

  // Every Page state draw after this fails with `error`.
  failDraws(error: string): void {
    this.drawError = error;
  }

  // The next run waits until the answer lets it end, failing with `error` when one is given.
  holdRun(): (error?: string) => void {
    this.running = new Gate();

    return this.running.settle;
  }

  private ports(withState: boolean): PageCallsPorts {
    return {
      scope: { projectId: 'argo', sessionId: 'session-1' },
      shown: () => this.shown(),
      patch: (patch) => this.patch(patch),
      unpatch: (patch) => this.unpatch(patch),
      run: (run) => this.run(run),
      failed: (error) => this.failures.push(error.message),
      ...(withState && { pageState: this.pageState() }),
    };
  }

  private pageState(): NonNullable<PageCallsPorts['pageState']> {
    return {
      change: (change) => this.change(change),
      loadMore: () => Promise.resolve(),
    };
  }

  private patch(patch: TreePatch): Promise<void> {
    this.patched = patch(this.shown());

    return Promise.resolve();
  }

  private unpatch(patch: TreePatch): void {
    this.patched = this.patched && patch(this.patched);
  }

  private async run(run: ScopedRun): Promise<void> {
    this.runs.push(run);
    await this.running?.promise;
  }

  private async change(change: PageState): Promise<void> {
    await this.draws?.promise;

    if (this.drawError) throw new Error(this.drawError);

    this.state = { ...this.state, ...change };
    this.drafts.push(this.state.draft);
  }
}
