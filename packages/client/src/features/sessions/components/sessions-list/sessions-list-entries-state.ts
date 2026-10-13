import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';
import { listEntries, type SessionsListEntry } from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

export interface CollapsedProjects {
  collapsed: ReadonlySet<string>;
  toggleProject: (id: string) => void;
}

// Which Project headings are collapsed, and the toggle for one.
export function useCollapsedProjects(): CollapsedProjects {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggleProject = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return { collapsed, toggleProject };
}

// On native, rows that move, appear or leave animate into place.
export function useAnimateReorder(entries: SessionsListEntry[]): void {
  const entryOrder = entries.map((entry) => entry.id).join('|');
  const previousOrder = useRef(entryOrder);
  useLayoutEffect(() => {
    if (previousOrder.current !== entryOrder && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    previousOrder.current = entryOrder;
  }, [entryOrder]);
}

export function useListEntries(
  { projects, sessions, query, archived }: SessionsListProps,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  return useMemo(
    () =>
      listEntries({
        projects,
        sessions,
        collapsed,
        hideEmptyProjects: !!query || archived,
      }),
    [projects, sessions, query, archived, collapsed],
  );
}
