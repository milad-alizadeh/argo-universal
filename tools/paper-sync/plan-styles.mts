import {
  layoutKeys,
  type Binding,
  type DesignNode,
  type Styles,
} from './model.mts';
import type { SyncPlan } from './plan-types.mts';

function desiredStyles(
  master: DesignNode,
  binding: Binding,
  rootId: string,
): Styles {
  if (master.id !== rootId) return master.styles;

  const styles = Object.fromEntries(
    Object.entries(master.styles).filter(([key]) => !layoutKeys.has(key)),
  );

  return { ...styles, ...binding.layout };
}

function normalizePadding(styles: Styles): Styles {
  return Object.fromEntries(
    Object.entries(styles).filter(
      ([key, value]) =>
        !(key.startsWith('padding') && /^(0|0px)$/.test(String(value))),
    ),
  );
}

function stylePatch(expected: Styles, current: Styles): Styles {
  const desired = normalizePadding(expected);
  const actual = normalizePadding(current);

  const changed = Object.entries(desired).filter(
    ([key, value]) => actual[key] !== value,
  );

  const removed = Object.keys(actual)
    .filter((key) => !(key in desired))
    .map((key) => [key, '']);

  return Object.fromEntries([...changed, ...removed]);
}

export function planStyles(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode,
): void {
  const patch = stylePatch(
    desiredStyles(source, plan.binding, plan.master.rootId),
    target.styles,
  );

  if (Object.keys(patch).length)
    plan.styles.push({ sourceId: source.id, styles: patch });
  planSvg(plan, source, target);
}

function planSvg(plan: SyncPlan, source: DesignNode, target: DesignNode): void {
  if (!source.svg) return;

  if (source.svg !== target.svg) replaceSvg(plan, source, target);
}

function replaceSvg(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode,
): void {
  if (!target.isVisible)
    throw new Error(
      `Cannot replace hidden SVG while preserving visibility: ${target.name}`,
    );

  if (source.id === plan.master.rootId)
    throw new Error('Replacing a root SVG is not supported');
  plan.svgReplacements.push(source.id);
}
