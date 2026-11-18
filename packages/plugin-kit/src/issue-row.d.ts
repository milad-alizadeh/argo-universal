import type { ReactElement } from 'react';
import type { PluginProps } from './index';

export type IssueCategory = 'open' | 'in-progress' | 'done' | 'not-planned';

export function issueStatusMark(
  category: IssueCategory,
  key?: string,
): ReactElement;

export function issueRow(
  props: Omit<
    PluginProps['ListItem'],
    'leading' | 'subtitle' | 'finished' | 'meta'
  > & {
    category: IssueCategory;
    issueKey: string;
    markKey?: string;
    labels?: ReactElement[];
    pills?: ReactElement[];
  },
  key: string | number,
): ReactElement;
