import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import { LineEnd } from './list-item-line-end';
import { hasMeta, Meta } from './list-item-meta';
import { InertLane, useOpenLane } from './list-item-pass-through';
import type { PlacedContentProps } from './list-item-placement';
import type { ListItemProps } from './list-item-props';

type SubtitleProps = Pick<
  ListItemProps,
  | 'subtitleTone'
  | 'subtitleDimmed'
  | 'subtitleLines'
  | 'subtitleIcon'
  | 'subtitleIconTone'
> & {
  text?: string;
  multiline?: boolean;
};

const subtitleLines = (props: SubtitleProps): number | undefined =>
  props.multiline ? undefined : (props.subtitleLines ?? 1);

function Subtitle(props: SubtitleProps): ReactNode {
  if (props.text === undefined) return null;

  if (props.subtitleIcon === undefined) return <SubtitleText {...props} />;

  return (
    <View className="min-w-0 flex-row items-center gap-1">
      <Icon name={props.subtitleIcon} tone={props.subtitleIconTone} />
      <View className="min-w-0 flex-1">
        <SubtitleText {...props} />
      </View>
    </View>
  );
}

function SubtitleText(props: SubtitleProps): ReactElement {
  return (
    <Text
      role="row-detail"
      tone={props.subtitleTone}
      dimmed={props.subtitleDimmed}
      numberOfLines={subtitleLines(props)}
    >
      {props.text}
    </Text>
  );
}

// A sidebar row's title is medium, or semibold while it holds news for its reader.
function titleWeight(
  props: Pick<ListItemProps, 'sidebar' | 'emphasized'>,
): string | undefined {
  if (props.emphasized) return 'font-semibold';

  return props.sidebar ? 'font-medium' : undefined;
}

// A multiline row shows its whole title; others keep it to one line.
const lineLimit = (multiline?: boolean): number | undefined =>
  multiline ? undefined : 1;

// The row's title line, a plain function rather than a component, so a row is no deeper than its Text.
export function rowTitle(
  props: ListItemProps & { inLine?: boolean },
): ReactElement {
  return (
    <Text
      role="row"
      tone={props.finished ? 'muted' : props.tone}
      numberOfLines={lineLimit(props.multiline)}
      className={cn(props.inLine && 'min-w-0 flex-1', titleWeight(props))}
    >
      {props.title}
    </Text>
  );
}

// A regular sidebar row ends its title line with its trailing item, 8 after the title, so the lines below run the full width.
const titleLineEnd = (props: ListItemProps): ReactNode =>
  props.titleEnd ?? (trailsTitle(props) ? props.trailing : undefined);

// Trailing accessories keep the trailing lane, so a row with them never moves its trailing item onto the title line.
export const trailsTitle = (
  props: Pick<ListItemProps, 'sidebar' | 'value' | 'trailingAccessories'>,
): boolean =>
  props.sidebar === true &&
  [props.value, props.trailingAccessories].every((part) => part === undefined);

// A row's subtitle shows every line when a description, Android's placed value or the caller asks for it.
const subtitleWraps = (props: PlacedContentProps): boolean =>
  [props.description, props.multiline, props.subtitleWraps].some(Boolean);

const subtitleOf = (props: PlacedContentProps): SubtitleProps => {
  const subtitleTone = props.subtitleTone ?? 'muted';

  return {
    text: props.subtitle,
    multiline: subtitleWraps(props),
    subtitleLines: props.subtitleLines,
    subtitleTone,
    subtitleDimmed: props.subtitleDimmed,
    subtitleIcon: props.subtitleIcon,
    subtitleIconTone: props.subtitleIconTone ?? subtitleTone,
  };
};

function TextLines(props: PlacedContentProps): ReactElement {
  return (
    <InertLane className="min-w-0 gap-0.5">
      <LineEnd end={titleLineEnd(props)}>{rowTitle(props)}</LineEnd>
      <LineEnd end={props.subtitleEnd}>
        <Subtitle {...subtitleOf(props)} />
      </LineEnd>
    </InertLane>
  );
}

export function ItemContent(props: PlacedContentProps): ReactElement {
  return (
    <View {...useOpenLane()} className="min-w-0 flex-1 gap-0.5">
      <TextLines {...props} />
      {hasMeta(props) ? (
        <Meta
          sidebar={props.sidebar === true}
          meta={props.meta}
          metaAccessories={props.metaAccessories}
        />
      ) : null}
    </View>
  );
}
