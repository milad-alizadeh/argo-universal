import { textSlots } from './labels.mts';
import type { DesignNode } from './model.mts';
import type { SyncPlan } from './plan-types.mts';

function slotText(plan: SyncPlan, label: DesignNode): string {
  return plan.binding.textOverrides[label.name] ?? label.textContent ?? '';
}

function planSlot(plan: SyncPlan, label: DesignNode): void {
  const text = slotText(plan, label);

  const current = plan.before.nodes.find(
    (node) => node.id === plan.binding.nodes[label.id],
  );

  if (current?.textContent !== text)
    plan.texts.push({ sourceId: label.id, text });
  plan.binding.lastText[label.name] = text;
}

export function planText(plan: SyncPlan): void {
  for (const label of textSlots(plan.master).values()) planSlot(plan, label);
}
