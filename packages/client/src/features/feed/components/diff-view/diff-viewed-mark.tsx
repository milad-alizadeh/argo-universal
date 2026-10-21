import { CheckButton } from '@repo/kit/primitives/actions/check-button';
import { Checkbox } from '@repo/kit/primitives/inputs/checkbox';
import type * as React from 'react';
import type { FileHeaderProps } from './diff-file-header';

type ViewedMarkProps = Pick<FileHeaderProps, 'viewed' | 'onViewedChange'> & {
  compact?: boolean;
};

type ActiveViewedMark = ViewedMarkProps &
  Required<Pick<FileHeaderProps, 'onViewedChange'>>;

export function ViewedMark(props: ViewedMarkProps): React.JSX.Element | null {
  if (!props.onViewedChange) return null;

  const mark = { ...props, onViewedChange: props.onViewedChange };

  if (props.compact) return <PhoneViewedMark {...mark} />;

  return <DesktopViewedMark {...mark} />;
}

function DesktopViewedMark(props: ActiveViewedMark): React.JSX.Element {
  return (
    <Checkbox
      label="Viewed"
      variant="inline"
      value={props.viewed ?? false}
      onValueChange={props.onViewedChange}
    />
  );
}

function PhoneViewedMark(props: ActiveViewedMark): React.JSX.Element {
  return (
    <CheckButton
      label="Viewed"
      value={props.viewed ?? false}
      onValueChange={props.onViewedChange}
    />
  );
}
