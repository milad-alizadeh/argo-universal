import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { ShimmerText } from './shimmer-text';

export interface FeedDisclosureLabelProps {
  label: string;
  running?: boolean;
  trailing?: string;
  awaitingApproval?: boolean;
  denied?: boolean;
  hovered: boolean;
}

const disclosureTitle = (label: string, trailing?: string): string =>
  trailing ? `${label} ${trailing}` : label;

// Every settled label keeps the same typography and tone, including on hover.
const plainLabelClassName = (props: FeedDisclosureLabelProps): string =>
  cn('min-w-0 shrink font-sans', {
    'line-through': props.denied,
  });

function PlainLabel(
  props: FeedDisclosureLabelProps & { title: string },
): React.JSX.Element {
  return (
    <Text
      role="body"
      tone="muted"
      numberOfLines={1}
      selectable={false}
      className={plainLabelClassName(props)}
    >
      {props.title}
    </Text>
  );
}

export function FeedDisclosureLabel(
  props: FeedDisclosureLabelProps,
): React.JSX.Element {
  const title = disclosureTitle(props.label, props.trailing);

  return props.running && !props.awaitingApproval ? (
    <ShimmerText
      text={title}
      emphasized={props.hovered}
      className="min-w-0 shrink type-body text-foreground"
    />
  ) : (
    <PlainLabel {...props} title={title} />
  );
}
