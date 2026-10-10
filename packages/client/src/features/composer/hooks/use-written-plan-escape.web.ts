import { useEffect } from 'react';
import type { WrittenPlanEscapeOptions } from './use-written-plan-escape';

export function useWrittenPlanEscape({
  composerId,
  expanded,
  onCollapse,
}: WrittenPlanEscapeOptions): void {
  useEffect(() => {
    if (!expanded) return;
    const collapseFromComposer = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing)
        return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)
        return;
      if (
        !(event.target instanceof Node) ||
        !document.getElementById(composerId)?.contains(event.target)
      )
        return;
      event.preventDefault();
      onCollapse();
    };
    document.addEventListener('keydown', collapseFromComposer, true);
    return (): void =>
      document.removeEventListener('keydown', collapseFromComposer, true);
  }, [composerId, expanded, onCollapse]);
}
