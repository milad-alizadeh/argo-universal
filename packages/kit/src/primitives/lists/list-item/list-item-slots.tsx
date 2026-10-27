import {
  useContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { Svg } from '#primitives/visual';
import { ListTileContext } from '../../../list-context';
import { useCompactRows } from '../../../list-look-context';
import { hasBadge, ItemBadge } from '../../../row-badge';
import { StatusMarkHidden } from '../../../status-mark-context';
import { cn } from '../../../utils';
import { CompactContent, ItemContent, trailsTitle } from './list-item-content';
import { Accessory, Control, Leading, Trailing } from './list-item-parts';
import type { DrawingProps } from './list-item-press-props';
import { TreeLane } from './list-item-tree';

// The row's lanes in order: a menu's check, leading, title, trailing, accessory, and a control on its own line.
export function ItemContentSlots(props: DrawingProps): ReactElement {
  const tile = useContext(ListTileContext);

  if (tile) return <TileContent props={props} aspect={tile.aspect} />;

  return <RowContentSlots {...props} />;
}

function RowContentSlots(props: DrawingProps): ReactElement {
  const compact = useCompactRows(props.sidebar);

  return (
    <TextClassContext value={undefined}>
      {props.choice}
      <Leading {...props} />
      <RowContent props={props} compact={compact} />
      {!compact && trailsTitle(props) ? null : <Trailing {...props} />}
      <Accessory>{props.accessory}</Accessory>
      <Control>{props.control}</Control>
    </TextClassContext>
  );
}

// A compact row draws its tree lane inside its one line; a regular row draws it before its content.
function RowContent({
  props,
  compact,
}: {
  props: DrawingProps;
  compact: boolean;
}): ReactNode {
  return compact ? <CompactRow {...props} /> : <RegularRow {...props} />;
}

const CompactRow = (props: DrawingProps): ReactNode =>
  props.content ?? <CompactContent {...props} />;

function RegularRow(props: DrawingProps): ReactElement {
  return (
    <>
      <TreeLane title={props.title} compact={false} />
      {props.content ?? <ItemContent {...props} />}
    </>
  );
}

type TileProps = { props: DrawingProps; aspect: number };

function TileContent({ props, aspect }: TileProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <TileMedia props={props} aspect={aspect} />
      <View className="w-full p-3 ios:px-3.5 android:px-3.5">
        {props.content ?? (
          <ItemContent title={props.title} subtitle={props.subtitle} />
        )}
      </View>
    </TextClassContext>
  );
}

function TileMedia({ props, aspect }: TileProps): ReactElement {
  return (
    <View
      className={mediaFrameClass(props.media)}
      style={{ aspectRatio: aspect }}
    >
      <StatusMarkHidden value={hasBadge(props.badge)}>
        {props.media}
      </StatusMarkHidden>
      <View className="absolute right-3 top-3">
        <ItemBadge badge={props.badge} />
      </View>
    </View>
  );
}

function mediaFrameClass(media: ReactNode): string {
  return cn(
    'relative w-full items-center justify-center overflow-hidden',
    isArtwork(media) && 'p-3',
  );
}

function isArtwork(media: ReactNode): boolean {
  return isValidElement(media) && media.type === Svg;
}
