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
import { hasBadge, ItemBadge } from '../../../row-badge';
import { StatusMarkHidden } from '../../../status-mark-context';
import { cn } from '../../../utils';
import { ItemContent, trailsTitle } from './list-item-content';
import { Accessory, Control, Leading, Trailing } from './list-item-parts';
import type { DrawingProps } from './list-item-press-props';

// The row's lanes in order: a menu's check, leading, title, trailing, accessory, and a control on its own line.
export function ItemContentSlots(props: DrawingProps): ReactElement {
  const tile = useContext(ListTileContext);

  if (tile) return <TileContent props={props} aspect={tile.aspect} />;

  return <RowContentSlots {...props} />;
}

function RowContentSlots(props: DrawingProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      {props.choice}
      <Leading {...props} />
      {props.content ?? <ItemContent {...props} />}
      {trailsTitle(props) ? null : <Trailing {...props} />}
      <Accessory>{props.accessory}</Accessory>
      <Control>{props.control}</Control>
    </TextClassContext>
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
