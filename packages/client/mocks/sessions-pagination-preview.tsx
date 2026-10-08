import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  SessionsList,
  type SessionsListProps,
} from '../src/components/sessions-list';
import { largeSessions } from './sessions-list-mock';

export function SessionsPaginationPreview(props: SessionsListProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function loadNextPage() {
    if (timer.current !== null || visibleCount >= 100) return;
    props.onEndReached();
    setLoading(true);
    timer.current = setTimeout(() => {
      setVisibleCount((count) => count + 20);
      setLoading(false);
      timer.current = null;
    }, 2000);
  }

  return (
    <View className="w-full flex-1 wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList
        {...props}
        sessions={largeSessions.slice(0, visibleCount)}
        isFetchingNextPage={loading}
        onEndReached={loadNextPage}
      />
    </View>
  );
}
