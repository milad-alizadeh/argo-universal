import type { ReactNode } from 'react';
import { CompactContent } from './list-item-compact-content';
import { ItemContent, trailsTitle } from './list-item-content';
import { Accessory, Control, hasLeading, Leading } from './list-item-parts';
import { InertLane } from './list-item-pass-through';
import type { DrawingProps } from './list-item-press-props';
import { Trailing } from './list-item-trailing';
import { TreeLane } from './list-item-tree';

/*
 * A row's lanes, each drawn only when the row has something for it: a lane with nothing to draw is no component at
 * all, so a plain row is only as deep as what it shows.
 */
export const leadingLanes = (
  props: DrawingProps,
  treeLane: boolean,
): ReactNode => (
  <>
    {choiceLane(props)}
    {treeLane ? <TreeLane title={props.title} compact={false} /> : null}
    {hasLeading(props) ? <Leading {...props} /> : null}
  </>
);

// A menu row's check.
const choiceLane = (props: DrawingProps): ReactNode =>
  props.choice === undefined ? null : <InertLane>{props.choice}</InertLane>;

// A compact row draws its tree lane inside its one line; a regular row draws it before its leading mark.
export function contentLane(props: DrawingProps, compact: boolean): ReactNode {
  if (props.content !== undefined) return props.content;

  return compact ? <CompactContent {...props} /> : <ItemContent {...props} />;
}

export const trailingLanes = (
  props: DrawingProps,
  compact: boolean,
): ReactNode => (
  <>
    {drawsTrailing(props, compact) ? <Trailing {...props} /> : null}
    {accessorySlot(props)}
    {props.control ? <Control>{props.control}</Control> : null}
  </>
);

const accessorySlot = (props: DrawingProps): ReactNode =>
  props.accessory ? <Accessory>{props.accessory}</Accessory> : null;

// A regular row's trailing mark joins its title when the title trails; otherwise it has its own lane.
function drawsTrailing(props: DrawingProps, compact: boolean): boolean {
  if (!compact && trailsTitle(props)) return false;

  return hasTrailing(props);
}

// What the trailing lane may draw: an item, a value, accessories, or a sidebar row's status.
const hasTrailing = (props: DrawingProps): boolean =>
  [props.trailing, props.value, props.trailingAccessories, props.badge].some(
    (part) => part !== undefined,
  );
