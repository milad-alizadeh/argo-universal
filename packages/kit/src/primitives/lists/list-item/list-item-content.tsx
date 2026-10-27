import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import type { PlacedContentProps } from './list-item-placement';
import type { ListItemProps } from './list-item-props';
import { TreeLane } from './list-item-tree';

type SubtitleProps = Pick<
  ListItemProps,
  'subtitleTone' | 'subtitleDimmed' | 'subtitleLines'
> & {
  text?: string;
  multiline?: boolean;
};

const subtitleLines = (props: SubtitleProps): number | undefined =>
  props.multiline ? undefined : (props.subtitleLines ?? 1);

function Subtitle(props: SubtitleProps): ReactNode {
  return props.text === undefined ? null : (
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

// Paper "SessionsList": a sidebar row's meta line sits 2 under its subtitle.
const metaClassName = (sidebar: boolean): string =>
  cn('min-w-0 flex-row items-center gap-3', sidebar ? 'pt-0.5' : 'pt-1');

function Meta(props: { children?: ReactNode; sidebar: boolean }): ReactNode {
  if (!props.children) return null;

  return <View className={metaClassName(props.sidebar)}>{props.children}</View>;
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

function Title(props: ListItemProps & { inLine?: boolean }): ReactElement {
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
function TitleLine(props: ListItemProps): ReactElement {
  if (!trailsTitle(props) || props.trailing === undefined)
    return <Title {...props} />;

  return (
    <View className="min-w-0 flex-row items-center gap-2">
      <Title {...props} inLine />
      <View className="shrink-0 flex-row items-center">{props.trailing}</View>
    </View>
  );
}

export const trailsTitle = (
  props: Pick<ListItemProps, 'sidebar' | 'value'>,
): boolean => props.sidebar === true && props.value === undefined;

// A row's subtitle shows every line when a description, Android's placed value or the caller asks for it.
const subtitleWraps = (props: PlacedContentProps): boolean =>
  [props.description, props.multiline, props.subtitleWraps].some(Boolean);

export function ItemContent(props: PlacedContentProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <TitleLine {...props} />
      <Subtitle
        text={props.subtitle}
        multiline={subtitleWraps(props)}
        subtitleLines={props.subtitleLines}
        subtitleTone={props.subtitleTone ?? 'muted'}
        subtitleDimmed={props.subtitleDimmed}
      />
      <Meta sidebar={props.sidebar === true}>{props.meta}</Meta>
    </View>
  );
}

// A compact row's subtitle reads beside its title, at the title's size and muted, short enough never to crowd it out.
function InlineSubtitle(props: PlacedContentProps): ReactNode {
  if (props.subtitle === undefined) return null;

  return (
    <Text
      role="row"
      tone={props.subtitleTone ?? 'muted'}
      dimmed={props.subtitleDimmed}
      numberOfLines={1}
      className="max-w-1/2 shrink-0"
    >
      {props.subtitle}
    </Text>
  );
}

/*
 * A compact List's row on a wide window is one line (Paper "Issue row"): the tree lane, then the subtitle leading the
 * title as a short muted identifier, such as an Issue's number, then the title, which truncates; the meta lane follows,
 * pushed to the end before trailing. The line holds no second line, so its subtitle is a word or two, not a sentence.
 */
export function CompactContent(props: PlacedContentProps): ReactElement {
  return (
    <>
      <View className="min-w-0 flex-1 flex-row items-center gap-1.5 self-stretch">
        <TreeLane title={props.title} compact />
        <InlineSubtitle {...props} />
        <Title {...props} multiline={false} inLine />
      </View>
      <CompactMeta meta={props.meta} />
    </>
  );
}

function CompactMeta({ meta }: Pick<PlacedContentProps, 'meta'>): ReactNode {
  if (!meta) return null;

  return <View className="shrink-0 flex-row items-center gap-1">{meta}</View>;
}
