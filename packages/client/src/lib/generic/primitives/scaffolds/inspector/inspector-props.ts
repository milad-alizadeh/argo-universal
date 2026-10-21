import type { ReactNode } from 'react';
import type { IconName } from '../../../symbols/icon-names';
import type { KitProps } from '../../kit-props';

// One of the Inspector's tabs: what it shows, its icon and, for a list, how many it holds.
export interface InspectorTab {
  key: string;
  label: string;
  icon: IconName;
  count?: number;
  // `success` while something in it runs.
  countTone?: 'success' | 'muted';
}

// The tabs drawn in place of the title, the one shown, and closing one.
export interface InspectorTabsProps {
  items: readonly InspectorTab[];
  selected: string;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}

/*
 * Kit-only: a bar that stays under the header while the content scrolls, such as the Changes comparison and totals;
 * tabs in place of the title, for an Inspector that shows one of several panels.
 */
export type InspectorProps = KitProps<'Inspector'> & {
  // A phone Inspector can own its header, such as the Git sheet's PR / File changes switcher.
  sheetHeader?: ReactNode;
  // The caller can retain a tab or drill-in page's scroll position while it is unmounted.
  scrollState?: {
    key: string;
    getOffset: () => number;
    onScroll: (offset: number) => void;
  };
  // The content owns its scroll view, for retained tab pages or virtualised detail.
  contentScrolls?: boolean;
  toolbar?: ReactNode;
  tabs?: InspectorTabsProps;
  testID?: string;
};
