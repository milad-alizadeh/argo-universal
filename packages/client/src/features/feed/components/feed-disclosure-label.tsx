import type * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import { ShimmerText } from './shimmer-text';

const regexSpecialCharacters = /[.*+?^${}()|[\]\\]/g;

export interface FeedDisclosureLabelProps {
  label: string;
  // Parts of the label to draw in mono.
  paths?: readonly string[];
  running?: boolean;
  trailing?: string;
  awaitingApproval?: boolean;
  denied?: boolean;
  hovered: boolean;
}

function pathPattern(paths: readonly string[]): string {
  return paths
    .flatMap((path) =>
      path ? [path.replaceAll(regexSpecialCharacters, '\\$&')] : [],
    )
    .join('|');
}

function monoPart(
  part: string,
  key: string,
  paths: readonly string[],
): ReactNode {
  // No line height of its own: a taller mono line box would push the label off the icons' centre line.
  return paths.includes(part) ? (
    <Text key={key} role="code" className="leading-none">
      {part}
    </Text>
  ) : (
    part
  );
}

function withMonoPaths(title: string, paths: readonly string[]): ReactNode[] {
  const pattern = pathPattern(paths);

  if (!pattern) return [title];
  let offset = 0;

  return title.split(new RegExp(`(${pattern})`)).map((part) => {
    const key = `${offset}`;
    offset += part.length;

    return monoPart(part, key, paths);
  });
}

const disclosureTitle = (label: string, trailing?: string): string =>
  trailing ? `${label} ${trailing}` : label;

// The colour comes from the Collapsible header, muted until hovered.
const plainLabelClassName = (props: FeedDisclosureLabelProps): string =>
  cn('min-w-0 shrink', {
    'text-warning': props.awaitingApproval,
    'line-through': props.denied,
  });

function PlainLabel(
  props: FeedDisclosureLabelProps & { title: string },
): React.JSX.Element {
  return (
    <Text
      numberOfLines={1}
      selectable={false}
      className={plainLabelClassName(props)}
    >
      {withMonoPaths(props.title, props.paths ?? [])}
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
