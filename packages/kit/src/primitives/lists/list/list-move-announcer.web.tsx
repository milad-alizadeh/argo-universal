import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import type { MoveNotice } from './list-move-feedback';

interface AnnouncerProps {
  notice: MoveNotice | null;
}

/*
 * Desktop and web: React Native Web's `announceForAccessibility` does nothing, so a polite live region, hidden from
 * sight, says where a moved row landed. Each notice draws a new text node, so a repeated one is heard again.
 */
export function MoveAnnouncer({ notice }: AnnouncerProps): ReactElement {
  return (
    <View role="status" aria-live="polite" className="sr-only">
      <Text key={notice?.count}>{notice?.text}</Text>
    </View>
  );
}
