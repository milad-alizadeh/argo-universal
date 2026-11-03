import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import { rowTitle } from './list-item-content';
import { compactMeta, hasMeta } from './list-item-meta';
import {
  hasAccessories,
  inertLane,
  openLane,
  usePassingThrough,
} from './list-item-pass-through';
import type { PlacedContentProps } from './list-item-placement';
import { TreeLane, useTreeLaneDrawn } from './list-item-tree';

// A compact row's subtitle reads beside its title, at the title's size and muted, short enough never to crowd it out.
function inlineSubtitle(props: PlacedContentProps): ReactNode {
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
  const through = usePassingThrough();
  const treeLane = useTreeLaneDrawn();

  return (
    <>
      <View {...openLane(through)} className={compactTitleClass(props)}>
        {treeLane ? <TreeLane title={props.title} compact /> : null}
        {inertLane(through, compactLine(props), compactLineClass)}
      </View>
      {compactMeta(props, through)}
    </>
  );
}

const compactLineClass =
  'min-w-0 flex-1 flex-row items-center gap-1.5 self-stretch';

// The subtitle, then the title that truncates, on the compact row's one line.
const compactLine = (props: PlacedContentProps): ReactElement => (
  <>
    {inlineSubtitle(props)}
    {rowTitle({ ...props, multiline: false, inLine: true })}
  </>
);

// Beside meta or accessories the title keeps at least half the line; they give up their width first.
const compactTitleClass = (props: PlacedContentProps): string =>
  cn(
    'min-w-0 flex-1 flex-row items-center gap-1.5 self-stretch',
    (hasAccessories(props) || hasMeta(props)) && 'min-w-1/2',
  );
