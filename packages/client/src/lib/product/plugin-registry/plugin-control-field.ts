import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import {
  componentEventRules,
  type ComponentEventRules,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import type { ControlInput, PluginProps } from './plugin-rendering';

// One user edit of a field, and how it reaches the Plugin.
export type Edit = {
  rules: ComponentEventRules;
  value?: WireJson;
  deliver: () => Promise<void>;
};

export type Change = (edit: Edit) => void;

// What the field shows: the accepted value, ordered by when each edit was made, so an answer arriving late never wins.
type Value = { sequence: number; value: WireJson | undefined };

type PendingEdit = { value: WireJson | undefined; blocks: boolean };

// The Component event whose metadata names a prop the App echoes at once.
const echoRules = (
  definition: KitComponentDefinition,
): Partial<ComponentEventRules> =>
  Object.values(definition.events)
    .map(componentEventRules)
    .find((rules) => rules.value !== undefined) ?? {};

const isDescendant = (child: string, key: string): boolean =>
  child.startsWith(`${key}/`) || child.startsWith(`${key}#`);

export class ControlField {
  private accepted: Value = { sequence: 0, value: undefined };
  // The Server's latest value, and whether the field has yet to show it.
  private source?: WireJson;
  private stale = false;
  private focused = false;
  private readonly pending = new Map<number, PendingEdit>();

  private constructor(
    public readonly type: string,
    public readonly rules: Partial<ComponentEventRules>,
  ) {}

  public static matching(
    field: ControlField | undefined,
    input: ControlInput,
  ): ControlField {
    return field?.type === input.node.type
      ? field
      : new ControlField(input.node.type, echoRules(input.definition));
  }

  // A pending blocking edit waits for its Server answer.
  public get blocked(): boolean {
    return [...this.pending.values()].some((edit) => edit.blocks);
  }

  // The newest pending edit shows until an edit after it is accepted.
  public get current(): WireJson | undefined {
    const last = [...this.pending].at(-1);

    return last && last[0] > this.accepted.sequence
      ? last[1].value
      : this.accepted.value;
  }

  // The Server's value shows once the field has no focus and no edit pending.
  public sync(source?: WireJson): void {
    if (!Object.is(this.source, source)) {
      this.source = source;
      this.stale = true;
    }

    if (this.showsServer()) {
      this.accepted = { ...this.accepted, value: source };
      this.stale = false;
    }
  }

  public blur(): void {
    this.focused = false;
  }

  // A blocking event waits for the one before it; an echo of the shown value changes nothing.
  public changeFor(update: () => void): Change {
    return (edit) => {
      if (this.waiting(edit) || this.echoed(edit)) return;
      this.request(edit, update);
    };
  }

  // A coalesced field keeps what the user types while it has focus.
  public focusProps(update: () => void): PluginProps {
    if (!this.rules.throttleMs) return {};

    return {
      onFocus: (): void => {
        this.focused = true;
      },
      onBlur: (): void => {
        this.focused = false;
        update();
      },
    };
  }

  private showsServer(): boolean {
    return this.stale && !this.focused && this.pending.size === 0;
  }

  private waiting(edit: Edit): boolean {
    return edit.rules.blocks && this.blocked;
  }

  private echoed(edit: Edit): boolean {
    return (
      edit.rules.value !== undefined && Object.is(edit.value, this.current)
    );
  }

  private request(edit: Edit, update: () => void): void {
    const sequence =
      Math.max(this.accepted.sequence, ...this.pending.keys()) + 1;

    const value = edit.rules.value ? edit.value : this.current;

    this.pending.set(sequence, { value, blocks: edit.rules.blocks });
    update();

    this.deliver(edit, { sequence, value }, update);
  }

  private deliver(edit: Edit, sent: Value, update: () => void): void {
    void edit
      .deliver()
      .then(() => this.accept(sent))
      // A refused edit leaves the last accepted value showing.
      .catch(() => {})
      .finally(() => {
        this.pending.delete(sent.sequence);
        update();
      });
  }

  private accept(value: Value): void {
    if (value.sequence > this.accepted.sequence) this.accepted = value;
  }
}

export function blurWithin(
  fields: Map<string, ControlField>,
  key: string,
): void {
  for (const [child, field] of fields)
    if (isDescendant(child, key)) field.blur();
}
