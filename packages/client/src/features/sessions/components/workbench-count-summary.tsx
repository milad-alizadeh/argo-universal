import type { ReactElement } from 'react';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import {
  StackedSummary,
  type StackedSummaryIcon,
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
  const icons: StackedSummaryIcon[] =
    count > 0 ? [{ icon, tone: 'neutral' }] : [];

  const label = `${count} ${noun}${count === 1 ? '' : 's'}`;

  return <StackedSummary icons={icons} texts={[label]} />;
}
