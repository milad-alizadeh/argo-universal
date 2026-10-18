import type { PartBinding, PartUi } from '@repo/contracts/plugins/kit';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { ControlChange, PluginProps } from './plugin-control-types';

type Draft = {
  value: WireJson | undefined;
  source: WireJson | undefined;
  rollback: WireJson | undefined;
  pending: boolean;
};

export class NodeControls {
  private readonly drafts = new Map<string, Draft>();
  private readonly pending = new Set<string>();
  private focused = false;

  public focus(focused: boolean): void {
    this.focused = focused;
  }

  public hold(binding: PartBinding, source: WireJson | undefined): void {
    const draft = this.drafts.get(binding.prop);

    if (!draft?.pending)
      this.drafts.set(binding.prop, {
        value: this.value(binding, source),
        source,
        rollback: source,
        pending: false,
      });
    this.focused = true;
  }

  public value(
    binding: PartBinding,
    source: WireJson | undefined,
  ): WireJson | undefined {
    const draft = this.drafts.get(binding.prop);

    if (!draft) return source;

    return this.keepsDraft(draft, source) ? draft.value : source;
  }

  private keepsDraft(draft: Draft, source: WireJson | undefined): boolean {
    if (this.focused || draft.pending) return true;

    return JSON.stringify(draft.source) === JSON.stringify(source);
  }

  public blocked(change: ControlChange): boolean {
    if (!this.pending.has(change.event)) return false;

    return blocksWhilePending(change);
  }

  public begin(change: ControlChange): Draft | undefined {
    this.pending.add(change.event);

    if (!change.binding) return undefined;

    return this.beginDraft(change.binding, change);
  }

  private beginDraft(binding: PartBinding, change: ControlChange): Draft {
    const source = change.node.props[binding.prop];
    const previous = this.drafts.get(binding.prop);

    const rollback = previous?.pending
      ? previous.rollback
      : this.value(binding, source);

    const draft = { value: change.payload, source, rollback, pending: true };
    this.drafts.set(binding.prop, draft);

    return draft;
  }

  public finish(
    change: ControlChange,
    request: Draft | undefined,
    failed: boolean,
  ): void {
    this.pending.delete(change.event);

    if (!change.binding || !request) return;
    this.settleDraft(change.binding, request, failed);
  }

  private settleDraft(
    binding: PartBinding,
    request: Draft,
    failed: boolean,
  ): void {
    request.pending = false;
    const current = this.drafts.get(binding.prop);

    if (!current) return;

    settleCurrent(current, request, failed);
  }

  public pendingProps(ui: Required<PartUi>, props: PluginProps): void {
    for (const event of this.pending) {
      applyPendingEvent(ui, event, props);

      if (blocksBinding(ui, event)) props.disabled = true;
    }
  }
}

function blocksWhilePending(change: ControlChange): boolean {
  if (change.binding?.pending) return true;

  return Boolean(change.ui.pending[change.event]);
}

function blocksBinding(ui: Required<PartUi>, event: string): boolean {
  return ui.bindings.some(
    (binding) => binding.event === event && binding.pending,
  );
}

function settleCurrent(current: Draft, request: Draft, failed: boolean): void {
  if (current === request) {
    restoreCurrent(current, failed);

    return;
  }

  if (!failed) current.rollback = request.value;
}

function restoreCurrent(draft: Draft, failed: boolean): void {
  if (failed) draft.value = draft.rollback;
}

function applyPendingEvent(
  ui: Required<PartUi>,
  event: string,
  props: PluginProps,
): void {
  const prop = ui.pending[event];

  if (prop) props[prop] = true;
}
