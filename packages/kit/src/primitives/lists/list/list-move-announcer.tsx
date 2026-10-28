import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { MoveNotice } from './list-move-notice';

interface AnnouncerProps {
  notice: MoveNotice | null;
}

// iOS and Android: VoiceOver and TalkBack say where a moved row landed.
export function MoveAnnouncer({ notice }: AnnouncerProps): ReactNode {
  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice.text);
  }, [notice]);

  return null;
}
