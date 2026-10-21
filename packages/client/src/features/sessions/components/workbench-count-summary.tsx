import type { ReactElement } from 'react';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import {
  StackedSummary,
  type SummaryMark,
} from '../../../lib/product/stacked-summary';

interface Props {
  count: number;
  icon: IconName;
  noun: 'agent' | 'shell';
}

export function WorkbenchCountSummary({
  count,
  icon,
  noun,
}: Props): ReactElement {
  const marks: SummaryMark[] = ['first', 'second', 'third']
    .slice(0, count)
    .map((key) => ({
      key,
      icon,
      tone: 'neutral',
    }));

  const label = `${count} ${noun}${count === 1 ? '' : 's'}`;

  return <StackedSummary marks={marks} label={label} />;
}
