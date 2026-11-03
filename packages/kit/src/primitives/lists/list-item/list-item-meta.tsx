import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import {
  accessoryLane,
  inertLane,
  openLane,
  usePassingThrough,
} from './list-item-pass-through';
import type { PlacedContentProps } from './list-item-placement';

// Paper "SessionsList": a sidebar row's meta line sits 2 under its subtitle.
const metaClassName = (sidebar: boolean): string =>
  cn('min-w-0 flex-row items-center gap-3', sidebar ? 'pt-0.5' : 'pt-1');

type MetaProps = Pick<PlacedContentProps, 'meta' | 'metaAccessories'>;

export const hasMeta = (props: MetaProps): boolean =>
  [props.meta, props.metaAccessories].some(Boolean);

// The meta line's own items take no press of their own; its accessories, after them, do.
function metaItems(props: MetaProps, through: boolean): ReactNode {
  return (
    <>
      {inertLane(
        through,
        props.meta,
        'min-w-0 shrink flex-row items-center gap-3',
      )}
      {accessoryLane(props.metaAccessories)}
    </>
  );
}

export function Meta(props: MetaProps & { sidebar: boolean }): ReactNode {
  const through = usePassingThrough();

  if (!hasMeta(props)) return null;

  return (
    <View {...openLane(through)} className={metaClassName(props.sidebar)}>
      {metaItems(props, through)}
    </View>
  );
}

// The compact meta takes what the title's half leaves and clips the rest, as a row of many labels would overflow.
const compactMetaClass =
  'min-w-0 shrink flex-row items-center gap-1 overflow-hidden';

// A plain function for the compact row, which read whether presses pass through already.
export function compactMeta(props: MetaProps, through: boolean): ReactNode {
  if (!hasMeta(props)) return null;

  return (
    <View {...openLane(through)} className={compactMetaClass}>
      {metaItems(props, through)}
    </View>
  );
}
