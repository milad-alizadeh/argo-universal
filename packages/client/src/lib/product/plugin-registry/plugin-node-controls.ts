import type { PartBinding, PartUi } from '@repo/contracts/plugins/kit';
import type { WireJson } from '@repo/contracts/plugins/wire';
import {
  draftValue,
  pendingDraft,
  retainedDraft,
  settleDraft,
  type ControlDraft,
} from './plugin-control-draft';
import type { ControlChange, PluginProps } from './plugin-control-types';

export class NodeControls {
  private readonly drafts = new Map<string, ControlDraft>();
  private readonly pending = new Set<string>();
  private focused = false;

  public focus(focused: boolean): void {
    this.focused = focused;
  }

  public hold(binding: PartBinding, source: WireJson | undefined): void {
    const draft = this.drafts.get(binding.prop);

    if (!(draft && pendingDraft(draft)))
      this.drafts.set(binding.prop, {
        value: this.value(binding, source),
        source,
        baseline: source,
        previous: undefined,
        outcome: 'accepted',
      });
    this.focused = true;
  }

  public value(
    binding: PartBinding,
    source: WireJson | undefined,
  ): WireJson | undefined {
    const draft = this.drafts.get(binding.prop);

    if (!draft) return source;

    return this.keepsDraft(draft, source) ? draftValue(draft) : source;
  }

  private keepsDraft(
    draft: ControlDraft,
    source: WireJson | undefined,
  ): boolean {
    if (pendingDraft(draft)) {
      draft.source = source;

      return true;
    }

    if (this.focused) return true;

    return JSON.stringify(draft.source) === JSON.stringify(source);
  }

  public blocked(change: ControlChange): boolean {
    if (!this.pending.has(change.event)) return false;

    return blocksWhilePending(change);
  }

  public begin(change: ControlChange): ControlDraft | undefined {
    this.pending.add(change.event);

    if (!change.binding) return undefined;

    return this.beginDraft(change.binding, change);
  }

  private beginDraft(
    binding: PartBinding,
    change: ControlChange,
  ): ControlDraft {
    const draft = createDraft(this.drafts.get(binding.prop), {
      value: change.payload,
      source: change.node.props[binding.prop],
      baseline: this.value(binding, change.node.props[binding.prop]),
    });

    this.drafts.set(binding.prop, draft);

    return draft;
  }

  public finish(
    change: ControlChange,
    request: ControlDraft | undefined,
    failed: boolean,
  ): void {
    this.pending.delete(change.event);

    if (request) settleDraft(request, failed);
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

function applyPendingEvent(
  ui: Required<PartUi>,
  event: string,
  props: PluginProps,
): void {
  const prop = ui.pending[event];

  if (prop) props[prop] = true;
}

function createDraft(
  previous: ControlDraft | undefined,
  values: Pick<ControlDraft, 'value' | 'source' | 'baseline'>,
): ControlDraft {
  return {
    ...values,
    previous: matchingDraft(previous, values.baseline),
    outcome: 'pending',
  };
}

function matchingDraft(
  previous: ControlDraft | undefined,
  baseline: WireJson | undefined,
): ControlDraft | undefined {
  const retained = retainedDraft(previous);

  if (
    retained &&
    JSON.stringify(draftValue(retained)) === JSON.stringify(baseline)
  )
    return retained;

  return undefined;
}
