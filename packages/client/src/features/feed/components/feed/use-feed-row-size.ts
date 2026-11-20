import { messageSlotId } from '@repo/contracts/plugins/replaceable';
import { useContext } from 'react';
import { Platform } from 'react-native';
import { ReplaceableSlotRenderer } from '#lib/product/plugin-registry/replaceable-slot';
import { emptyMessageSize } from './feed-row-data';

const nativeEmptyMessageSize =
  Platform.OS === 'web' ? undefined : emptyMessageSize;

export function useFeedRowSize(): typeof emptyMessageSize | undefined {
  const drawing = useContext(ReplaceableSlotRenderer);

  return drawing?.replaced.includes(messageSlotId)
    ? undefined
    : nativeEmptyMessageSize;
}
