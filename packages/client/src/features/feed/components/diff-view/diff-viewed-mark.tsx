import { CheckButton } from '@repo/kit/primitives/actions/check-button';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import type * as React from 'react';
import type { FileHeaderProps } from './diff-file-header';

type ViewedMarkProps = Pick<FileHeaderProps, 'viewed' | 'onViewedChange'> & {
  compact?: boolean;
};

const viewedTooltip = (viewed: boolean | undefined): string =>
  viewed ? 'Mark as not viewed' : 'Mark as viewed';

// Desktop draws the mark with its "Viewed" label and a tooltip; the phone keeps the bare circular check.
export function ViewedMark(props: ViewedMarkProps): React.JSX.Element | null {
  if (!props.onViewedChange) return null;

  const mark = (
    <CheckButton
      label="Viewed"
      labelled={!props.compact}
      value={props.viewed === true}
      onValueChange={props.onViewedChange}
    />
  );

  if (props.compact) return mark;

  return <Tooltip label={viewedTooltip(props.viewed)}>{mark}</Tooltip>;
}
