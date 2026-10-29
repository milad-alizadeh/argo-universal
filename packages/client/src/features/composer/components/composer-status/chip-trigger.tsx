import { Pill, type PillProps } from '@repo/kit/primitives/status/pill';
import type { ReactElement } from 'react';

export type ChipTriggerProps = Omit<PillProps, 'text' | 'variant'> & {
  label: string;
};

export function ChipTrigger({
  label,
  ...props
}: ChipTriggerProps): ReactElement {
  return <Pill {...props} variant="control" text={label} />;
}
