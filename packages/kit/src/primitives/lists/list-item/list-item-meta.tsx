import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#kit/use-spacing';
import { FittedRow } from '../../../fitted-row/fitted-row';
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

/*
 * The meta line's own items take no press of their own; its accessories, after them, do. Its items show whole: those
 * that fit, then a count of the rest, so a row of many labels never cuts one at its edge.
 */
function MetaItems(props: MetaProps & { through: boolean }): ReactNode {
  const gap = useSpacing('--spacing-3');

  return (
    <>
      {inertLane(
        props.through,
        props.meta === undefined ? null : (
          <FittedRow gap={gap}>{props.meta}</FittedRow>
        ),
        'min-w-0 shrink flex-row items-center',
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
      <MetaItems {...props} through={through} />
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
      <MetaItems {...props} through={through} />
    </View>
  );
}
