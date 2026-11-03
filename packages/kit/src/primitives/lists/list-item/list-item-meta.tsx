import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#kit/use-spacing';
import { FittedRow } from '../../../fitted-row/fitted-row';
import { cn } from '../../../utils';
import {
  AccessoryLane,
  InertLane,
  useOpenLane,
} from './list-item-pass-through';
import type { PlacedContentProps } from './list-item-placement';

// Paper "SessionsList": a sidebar row's meta line sits 2 under its subtitle.
const metaClassName = (sidebar: boolean): string =>
  cn('min-w-0 flex-row items-center gap-3', sidebar ? 'pt-0.5' : 'pt-1');

type MetaProps = Pick<PlacedContentProps, 'meta' | 'metaAccessories'>;

const hasMeta = (props: MetaProps): boolean =>
  [props.meta, props.metaAccessories].some(Boolean);

/*
 * The meta line's own items take no press of their own; its accessories, after them, do. Its items show whole: those
 * that fit, then a count of the rest, so a row of many labels never cuts one at its edge.
 */
function MetaItems(props: MetaProps): ReactNode {
  const gap = useSpacing('--spacing-3');

  return (
    <>
      <InertLane className="min-w-0 shrink flex-row items-center">
        {props.meta === undefined ? null : (
          <FittedRow gap={gap}>{props.meta}</FittedRow>
        )}
      </InertLane>
      <AccessoryLane>{props.metaAccessories}</AccessoryLane>
    </>
  );
}

export function Meta(props: MetaProps & { sidebar: boolean }): ReactNode {
  const open = useOpenLane();

  if (!hasMeta(props)) return null;

  return (
    <View {...open} className={metaClassName(props.sidebar)}>
      <MetaItems {...props} />
    </View>
  );
}

// The compact meta takes what the title's half leaves and clips the rest, as a row of many labels would overflow.
const compactMetaClass =
  'min-w-0 shrink flex-row items-center gap-1 overflow-hidden';

export function CompactMeta(props: MetaProps): ReactNode {
  const open = useOpenLane();

  if (!hasMeta(props)) return null;

  return (
    <View {...open} className={compactMetaClass(props)}>
      <MetaItems {...props} />
    </View>
  );
}
