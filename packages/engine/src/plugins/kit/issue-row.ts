import type { ReactElement } from 'react';
import type { ElementProps } from './element-props';
import { jsx } from './jsx-runtime';

const marks = {
  open: { name: 'pending', tone: 'muted', filled: false },
  'in-progress': {
    name: { sf: 'circle.lefthalf.filled', material: 'contrast' },
    tone: 'info',
  },
  done: { name: 'passed', tone: 'done', filled: true },
  'not-planned': { name: 'failed', tone: 'muted', filled: true },
} as const;

type Category = keyof typeof marks;

export function issueStatusMark(
  category: Category,
  key?: string,
): ReactElement {
  return jsx('Icon', { ...marks[category], size: 'sm' }, key);
}

interface IssueRowProps extends ElementProps {
  category: Category;
  issueKey: string;
  markKey?: string;
  labels?: ReactElement[];
  pills?: ReactElement[];
}

const finished = (category: Category): boolean =>
  category === 'done' || category === 'not-planned';

function rowProps({
  category,
  issueKey,
  markKey,
  ...args
}: IssueRowProps): ElementProps {
  const { labels, pills, ...props } = args;

  return {
    ...props,
    leading: issueStatusMark(category, markKey),
    subtitle: issueKey,
    finished: finished(category),
    meta: [...(labels ?? []), ...(pills ?? [])],
  };
}

// Return the keyed ListItem itself so its list can nest it and patch its marks.
export const issueRow = (
  props: IssueRowProps,
  key: string | number,
): ReactElement => jsx('ListItem', rowProps(props), key);
