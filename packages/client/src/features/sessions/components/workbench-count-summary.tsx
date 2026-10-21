import type { ReactElement } from 'react';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import { TintedAvatar } from '../../../lib/generic/tinted-avatar';
import { StackedSummary } from '../../../lib/product/stacked-summary';

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
  const marks = ['first', 'second', 'third'].slice(0, count).map((key) => ({
    key,
    node: <TintedAvatar icon={icon} tone="neutral" size="inline" />,
  }));

  const label = `${count} ${noun}${count === 1 ? '' : 's'}`;

  return <StackedSummary marks={marks} label={label} />;
}
