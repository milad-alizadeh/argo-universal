import { CheckButton } from '@repo/kit/primitives/actions/check-button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
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
    <IconButton
      icon="check"
      accessibilityLabel="Viewed"
      variant="ghost"
      size="sm"
      selected={props.viewed ?? false}
      onPress={() => props.onViewedChange(!props.viewed)}
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
