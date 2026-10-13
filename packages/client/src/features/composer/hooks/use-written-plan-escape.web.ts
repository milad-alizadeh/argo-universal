import { useEffect } from 'react';
import type { WrittenPlanEscapeOptions } from './use-written-plan-escape';

function plainEscape(event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !blockedEscape(event);
}

function blockedEscape(event: KeyboardEvent): boolean {
  return [
    event.defaultPrevented,
    event.isComposing,
    event.ctrlKey,
    event.altKey,
    event.metaKey,
    event.shiftKey,
  ].some(Boolean);
}

function insideComposer(event: KeyboardEvent, composerId: string): boolean {
  return (
    event.target instanceof Node &&
    !!document.getElementById(composerId)?.contains(event.target)
  );
}

function collapseFromComposer({
  composerId,
  onCollapse,
}: WrittenPlanEscapeOptions): (event: KeyboardEvent) => void {
  return (event): void => {
    if (!plainEscape(event) || !insideComposer(event, composerId)) return;
    event.preventDefault();
    onCollapse();
  };
}

export function useWrittenPlanEscape(options: WrittenPlanEscapeOptions): void {
  const { composerId, expanded, onCollapse } = options;
  useEffect(() => {
    if (!expanded) return;
    const collapse = collapseFromComposer({ composerId, expanded, onCollapse });
    document.addEventListener('keydown', collapse, true);

    return (): void => document.removeEventListener('keydown', collapse, true);
  }, [composerId, expanded, onCollapse]);
}
