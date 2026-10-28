import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import { InertLane, useOpenLane } from './list-item-pass-through';
import type { PlacedContentProps } from './list-item-placement';

// Paper "SessionsList": a sidebar row's meta line sits 2 under its subtitle.
const metaClassName = (sidebar: boolean): string =>
  cn('min-w-0 flex-row items-center gap-3', sidebar ? 'pt-0.5' : 'pt-1');

type MetaProps = Pick<PlacedContentProps, 'meta' | 'metaAccessories'>;

const hasMeta = (props: MetaProps): boolean =>
  [props.meta, props.metaAccessories].some(Boolean);

// The meta line's own items take no press of their own; its accessories, after them, do.
function MetaItems(props: MetaProps): ReactNode {
  return (
    <>
      <InertLane className="min-w-0 shrink flex-row items-center gap-3">
        {props.meta}
      </InertLane>
      {props.metaAccessories}
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

const compactMetaClass = (props: MetaProps): string =>
  cn(
    'flex-row items-center gap-1',
    props.metaAccessories === undefined ? 'shrink-0' : 'min-w-0 shrink',
  );

export function CompactMeta(props: MetaProps): ReactNode {
  const open = useOpenLane();

  if (!hasMeta(props)) return null;

  return (
    <View {...open} className={compactMetaClass(props)}>
      <MetaItems {...props} />
    </View>
  );
}
